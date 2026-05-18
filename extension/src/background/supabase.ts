import type { Settings } from '../types'
import { SUPABASE_ANON, SUPABASE_URL } from '../config'
import { refreshAccessToken } from './auth'

const AUTH_FAILURE_BODY = JSON.stringify({ error: 'auth_required' })

function authFailureResponse(): Response {
  return new Response(AUTH_FAILURE_BODY, {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

async function clearAuthTokens(): Promise<void> {
  await chrome.storage.local.remove(['accessToken', 'refreshToken'])
}

async function resolveVerifiedSettings(
  settings: Settings,
): Promise<Settings | null> {
  if (!settings.refreshToken) {
    return null
  }

  const refreshed = await refreshAccessToken(settings.refreshToken)
  if ('error' in refreshed) {
    await clearAuthTokens()
    return null
  }

  return {
    ...settings,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  }
}

function createHeaders(
  options: RequestInit,
  accessToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON,
    ...(options.headers as Record<string, string>),
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else {
    delete headers.Authorization
  }

  return headers
}

async function performFetch(
  path: string,
  options: RequestInit,
  accessToken?: string,
): Promise<Response> {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: createHeaders(options, accessToken),
  })
}

export async function supabaseFetch(
  settings: Settings,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let response = await performFetch(path, options, settings.accessToken)
  if (response.status !== 401 && response.status !== 403) {
    return response
  }

  const refreshedSettings = await resolveVerifiedSettings(settings)
  if (!refreshedSettings?.accessToken) {
    await clearAuthTokens()
    return authFailureResponse()
  }

  response = await performFetch(path, options, refreshedSettings.accessToken)
  if (response.status === 401 || response.status === 403) {
    await clearAuthTokens()
    return authFailureResponse()
  }

  return response
}
