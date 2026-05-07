import type { Settings } from '../types'
import { SUPABASE_ANON, SUPABASE_URL } from '../config'

export async function supabaseFetch(
  settings: Settings,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (settings.accessToken) {
    headers.Authorization = `Bearer ${settings.accessToken}`
  }

  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers,
  })
}
