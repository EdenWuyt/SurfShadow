// Sends Supabase HTTP requests with one refresh-and-retry cycle for unauthorized responses.
import type { Settings } from '../types'
import { SUPABASE_ANON, SUPABASE_URL } from '../config'
import { isUnauthorizedStatus } from './response'
import { clearStoredSession, refreshSession } from './session'

const AUTH_FAILURE_BODY = JSON.stringify({ error: 'auth_required' })

function authFailureResponse(): Response {
  return new Response(AUTH_FAILURE_BODY, {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
    },
  })
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
  if (!isUnauthorizedStatus(response.status)) {
    return response
  }

  const refreshedSettings = await refreshSession(settings)
  if (!refreshedSettings?.accessToken) {
    return authFailureResponse()
  }

  response = await performFetch(path, options, refreshedSettings.accessToken)
  if (isUnauthorizedStatus(response.status)) {
    await clearStoredSession()
    return authFailureResponse()
  }

  return response
}
