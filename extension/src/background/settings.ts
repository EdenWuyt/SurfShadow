// Loads persisted extension settings and upgrades them into the current validated session state.
import type { Settings } from '../types'
import { ensureProfile } from './profile'
import { resolveCurrentSession } from './session'

export async function getStoredSettings(): Promise<Settings> {
  return chrome.storage.local.get([
    'accessToken', 'refreshToken', 'defaultLanguage',
  ]) as Promise<Settings>
}

export async function getSettings(): Promise<Settings> {
  const resolvedSettings = await resolveCurrentSession(await getStoredSettings())

  if (!resolvedSettings.accessToken) return resolvedSettings
  if (!resolvedSettings.defaultLanguage) return ensureProfile(resolvedSettings)
  return resolvedSettings
}
