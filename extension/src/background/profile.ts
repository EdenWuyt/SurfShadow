// Reads and writes the user's synced profile defaults in Supabase.
import { LANGUAGES } from '../shared/languages'
import type { Settings } from '../types'
import { getUserId } from './jwt'
import { supabaseFetch } from './supabase'

interface ProfileRow {
  id: string
  default_language: string
  quota_used: number
  quota_reset_at: string | null
}

function resolveDefaultLanguage(language?: string): string {
  if (language && LANGUAGES.some((item) => item.code === language)) return language
  return LANGUAGES[0]?.code ?? 'en-US'
}


async function readProfile(settings: Settings, userId: string): Promise<ProfileRow | null> {
  const res = await supabaseFetch(
    settings,
    `/rest/v1/profiles?id=eq.${userId}&select=id,default_language,quota_used,quota_reset_at`,
    { method: 'GET' },
  )

  if (!res.ok) {
    throw new Error(`Failed to load profile: ${res.status}`)
  }

  const rows = await res.json() as ProfileRow[]
  return rows[0] ?? null
}

async function writeProfile(
  settings: Settings,
  profile: Pick<ProfileRow, 'id' | 'default_language'>,
): Promise<ProfileRow> {
  const res = await supabaseFetch(settings, '/rest/v1/profiles', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(profile),
  })

  if (!res.ok) {
    throw new Error(`Failed to save profile: ${res.status}`)
  }

  const rows = await res.json() as ProfileRow[]
  const row = rows[0]
  if (!row) throw new Error('Profile save returned no row')
  return row
}

async function cacheProfileDefaults(profile: Pick<ProfileRow, 'default_language'>): Promise<void> {
  await chrome.storage.local.set({
    defaultLanguage: profile.default_language,
  })
}

export async function ensureProfile(settings: Settings): Promise<Settings> {
  if (!settings.accessToken) return settings

  const userId = getUserId(settings.accessToken)
  if (!userId) return settings

  const fallbackLanguage = resolveDefaultLanguage(settings.defaultLanguage)

  let profile = await readProfile(settings, userId)
  if (!profile) {
    profile = await writeProfile(settings, {
      id: userId,
      default_language: fallbackLanguage,
    })
  }

  await cacheProfileDefaults(profile)

  return {
    ...settings,
    defaultLanguage: profile.default_language,
  }
}

export async function saveProfileDefaults(
  settings: Settings,
  defaultLanguage: string,
): Promise<Settings> {
  const language = resolveDefaultLanguage(defaultLanguage)

  await chrome.storage.local.set({
    defaultLanguage: language,
  })

  const newSettings = {
    ...settings,
    defaultLanguage: language,
  }

  if (settings.accessToken) {
    const userId = getUserId(settings.accessToken)
    if (userId) {
      await writeProfile(settings, {
        id: userId,
        default_language: language,
      })
    }
  }

  return newSettings
}
