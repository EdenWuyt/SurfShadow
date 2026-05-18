// Covers the extension's background auth/session helpers and snippet request behavior.
import assert from 'node:assert/strict'
import test from 'node:test'
import { checkSnippetSaved, deleteSnippet, saveSnippet } from '../src/background/snippets'
import { isUnauthorizedStatus, readErrorMessage } from '../src/background/response'
import { buildSnippetLookupPath } from '../src/background/snippet-paths'
import { resolveCurrentSession } from '../src/background/session'
import { supabaseFetch } from '../src/background/supabase'
import type { Settings } from '../src/types'

type FetchCall = {
  input: RequestInfo | URL
  init?: RequestInit
}

function createToken(expOffsetSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    }),
  ).toString('base64url')

  return `${header}.${payload}.signature`
}

function installChromeMock(storedSettings: Settings) {
  const state = { ...storedSettings }
  let removeCalls = 0
  let setCalls = 0

  const chromeMock = {
    storage: {
      local: {
        async get(keys: string[]) {
          return Object.fromEntries(keys.map((key) => [key, state[key as keyof Settings]]))
        },
        async remove(keys: string[]) {
          removeCalls += 1
          keys.forEach((key) => {
            delete state[key as keyof Settings]
          })
        },
        async set(next: Partial<Settings>) {
          setCalls += 1
          Object.assign(state, next)
        },
      },
    },
  }

  globalThis.chrome = chromeMock as typeof chrome

  return {
    getRemoveCalls: () => removeCalls,
    getSetCalls: () => setCalls,
    getState: () => ({ ...state }),
  }
}

function installFetchMock(handlers: Array<(call: FetchCall) => Promise<Response> | Response>) {
  const calls: FetchCall[] = []
  let index = 0

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const handler = handlers[index]
    index += 1
    if (!handler) {
      throw new Error(`Unexpected fetch call #${index}: ${String(input)}`)
    }

    const call = { input, init }
    calls.push(call)
    return handler(call)
  }) as typeof fetch

  return calls
}

test('isUnauthorizedStatus matches Supabase auth failures', () => {
  assert.equal(isUnauthorizedStatus(401), true)
  assert.equal(isUnauthorizedStatus(403), true)
  assert.equal(isUnauthorizedStatus(400), false)
  assert.equal(isUnauthorizedStatus(500), false)
})

test('readErrorMessage prefers API payload error', async () => {
  const response = new Response(JSON.stringify({ error: 'Duplicate snippet already exists' }), {
    status: 409,
    headers: { 'Content-Type': 'application/json' },
  })

  const message = await readErrorMessage(response, 'Save failed: 409')
  assert.equal(message, 'Duplicate snippet already exists')
})

test('readErrorMessage falls back when body is not json', async () => {
  const response = new Response('not json', { status: 500 })

  const message = await readErrorMessage(response, 'TTS request failed')
  assert.equal(message, 'TTS request failed')
})

test('buildSnippetLookupPath encodes text and language filter', () => {
  const path = buildSnippetLookupPath('hello world', 'ja-JP')

  assert.equal(
    path,
    '/rest/v1/snippets?select=id&text=eq.hello+world&language=eq.ja-JP&limit=1',
  )
})

test('resolveCurrentSession keeps a validated access token', async () => {
  const token = createToken(3600)
  installChromeMock({ accessToken: token, defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }),
  ])

  const resolved = await resolveCurrentSession({
    accessToken: token,
    defaultLanguage: 'en-US',
  })

  assert.equal(resolved.accessToken, token)
  assert.equal(resolved.defaultLanguage, 'en-US')
})

test('resolveCurrentSession refreshes when validation fails', async () => {
  const token = createToken(3600)
  installChromeMock({ accessToken: token, refreshToken: 'refresh-1', defaultLanguage: 'ja-JP' })
  installFetchMock([
    () => new Response('nope', { status: 401 }),
    () =>
      new Response(JSON.stringify({
        access_token: 'refreshed-token',
        refresh_token: 'refresh-2',
      }), { status: 200 }),
  ])

  const resolved = await resolveCurrentSession({
    accessToken: token,
    refreshToken: 'refresh-1',
    defaultLanguage: 'ja-JP',
  })

  assert.equal(resolved.accessToken, 'refreshed-token')
  assert.equal(resolved.refreshToken, 'refresh-2')
})

test('resolveCurrentSession returns signed-out settings when refresh fails', async () => {
  const token = createToken(3600)
  const chromeState = installChromeMock({ accessToken: token, refreshToken: 'refresh-1', defaultLanguage: 'ko-KR' })
  installFetchMock([
    () => new Response('nope', { status: 401 }),
    () => new Response('refresh failed', { status: 400 }),
  ])

  const resolved = await resolveCurrentSession({
    accessToken: token,
    refreshToken: 'refresh-1',
    defaultLanguage: 'ko-KR',
  })

  assert.equal(resolved.accessToken, undefined)
  assert.equal(resolved.refreshToken, undefined)
  assert.equal(resolved.defaultLanguage, 'ko-KR')
  assert.equal(chromeState.getRemoveCalls(), 1)
})

test('supabaseFetch refreshes once after unauthorized and retries with the new token', async () => {
  const token = createToken(3600)
  const calls = installFetchMock([
    () => new Response('unauthorized', { status: 401 }),
    () =>
      new Response(JSON.stringify({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      }), { status: 200 }),
    () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ])
  installChromeMock({ accessToken: token, refreshToken: 'refresh-1' })

  const response = await supabaseFetch(
    { accessToken: token, refreshToken: 'refresh-1' },
    '/functions/v1/request-tts-audio',
    { method: 'POST', body: JSON.stringify({ text: 'hello' }) },
  )

  assert.equal(response.status, 200)
  assert.equal(calls.length, 3)
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, `Bearer ${token}`)
  assert.equal((calls[1].init?.headers as Record<string, string>).apikey.length > 0, true)
  assert.equal((calls[2].init?.headers as Record<string, string>).Authorization, 'Bearer new-access-token')
})

test('supabaseFetch returns auth_required and clears stored session when refresh fails', async () => {
  const token = createToken(3600)
  const chromeState = installChromeMock({ accessToken: token, refreshToken: 'refresh-1' })
  installFetchMock([
    () => new Response('unauthorized', { status: 401 }),
    () => new Response('refresh failed', { status: 400 }),
  ])

  const response = await supabaseFetch(
    { accessToken: token, refreshToken: 'refresh-1' },
    '/functions/v1/create-snippet',
    { method: 'POST', body: JSON.stringify({ text: 'hello' }) },
  )

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'auth_required' })
  assert.equal(chromeState.getRemoveCalls(), 1)
})

test('saveSnippet maps unauthorized results to auth_required', async () => {
  const token = createToken(3600)
  installChromeMock({ accessToken: token, defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }),
    () => new Response('unauthorized', { status: 401 }),
  ])

  const result = await saveSnippet('hello', 'en-US')
  assert.deepEqual(result, { error: 'auth_required' })
})

test('saveSnippet returns parsed backend errors', async () => {
  installChromeMock({ defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ error: 'Duplicate snippet already exists' }), { status: 409 }),
  ])

  const result = await saveSnippet('hello', 'en-US')
  assert.deepEqual(result, { error: 'Duplicate snippet already exists' })
})

test('saveSnippet returns success when the backend accepts the create', async () => {
  installChromeMock({ defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ])

  const result = await saveSnippet('hello', 'en-US')
  assert.deepEqual(result, { success: true })
})

test('deleteSnippet maps unauthorized results to auth_required', async () => {
  const token = createToken(3600)
  installChromeMock({ accessToken: token, defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }),
    () => new Response('unauthorized', { status: 401 }),
  ])

  const result = await deleteSnippet('hello', 'en-US')
  assert.deepEqual(result, { error: 'auth_required' })
})

test('deleteSnippet returns parsed backend errors', async () => {
  installChromeMock({ defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ error: 'Snippet not found' }), { status: 404 }),
  ])

  const result = await deleteSnippet('hello', 'en-US')
  assert.deepEqual(result, { error: 'Snippet not found' })
})

test('deleteSnippet returns success when the backend accepts the delete', async () => {
  installChromeMock({ defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ])

  const result = await deleteSnippet('hello', 'en-US')
  assert.deepEqual(result, { success: true })
})

test('checkSnippetSaved returns true when the snippet exists', async () => {
  const token = createToken(3600)
  installChromeMock({ accessToken: token, defaultLanguage: 'en-US' })
  installFetchMock([
    () => new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }),
    () => new Response(JSON.stringify([{ id: 'snippet-1' }]), { status: 200 }),
  ])

  const result = await checkSnippetSaved('hello', 'en-US')
  assert.deepEqual(result, { saved: true })
})
