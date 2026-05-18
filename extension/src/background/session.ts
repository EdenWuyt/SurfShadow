// Reconciles stored auth state into a usable current session for background requests.
import type { Settings } from '../types'
import { refreshAccessToken, validateAccessToken } from './auth'
import { isTokenExpired } from './jwt'

export async function clearStoredSession(): Promise<void> {
  await chrome.storage.local.remove(['accessToken', 'refreshToken'])
}

export async function refreshSession(settings: Settings): Promise<Settings | null> {
  if (!settings.refreshToken) return null

  const refreshed = await refreshAccessToken(settings.refreshToken)
  if ('error' in refreshed) {
    await clearStoredSession()
    return null
  }

  return {
    ...settings,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  }
}

export async function resolveCurrentSession(settings: Settings): Promise<Settings> {
  if (!settings.accessToken) return settings

  if (!isTokenExpired(settings.accessToken)) {
    const isValid = await validateAccessToken(settings.accessToken)
    if (isValid) return settings
  }

  const refreshed = await refreshSession(settings)
  if (refreshed) return refreshed

  return {
    ...settings,
    accessToken: undefined,
    refreshToken: undefined,
  }
}
