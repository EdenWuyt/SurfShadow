import type { Settings } from '../types'
import { refreshAccessToken, validateAccessToken } from './auth'
import { isTokenExpired } from './jwt'
import { ensureProfile } from './profile'

export async function getStoredSettings(): Promise<Settings> {
  return chrome.storage.local.get([
    'accessToken', 'refreshToken', 'defaultLanguage',
  ]) as Promise<Settings>
}

export async function getSettings(): Promise<Settings> {
  const settings = await getStoredSettings()

  if (!settings.accessToken) return settings

  if (!isTokenExpired(settings.accessToken)) {
    const isValid = await validateAccessToken(settings.accessToken)
    if (isValid) {
      if (!settings.defaultLanguage) return ensureProfile(settings)
      return settings
    }
  }

  if (!settings.refreshToken) {
    await chrome.storage.local.remove(['accessToken', 'refreshToken'])
    return {
      ...settings,
      accessToken: undefined,
      refreshToken: undefined,
    }
  }

  const refreshed = await refreshAccessToken(settings.refreshToken)
  if ('error' in refreshed) {
    await chrome.storage.local.remove(['accessToken', 'refreshToken'])
    return {
      ...settings,
      accessToken: undefined,
      refreshToken: undefined,
    }
  }

  return ensureProfile({
    ...settings,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  })
}
