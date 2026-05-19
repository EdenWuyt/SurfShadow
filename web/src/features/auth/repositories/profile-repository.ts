import { supabase } from '@/lib/supabase'
import { LANGUAGES } from '@/shared/languages'
import type { Profile } from '@/shared/types'

function resolveDefaultLanguage(language?: string): string {
  if (language && LANGUAGES.some((item) => item.code === language)) return language
  return LANGUAGES[0]?.code ?? 'en-US'
}

/**
 * Reads the authenticated Supabase user id that owns profile rows.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return user?.id ?? null
}

/**
 * Loads the profile row for one user without creating or mutating anything.
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, default_language, quota_used, quota_reset_at, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Creates the initial profile row used by both web and extension clients after first sign-in.
 */
export async function createProfile(userId: string, defaultLanguage?: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      default_language: resolveDefaultLanguage(defaultLanguage),
    })
    .select('id, default_language, quota_used, quota_reset_at, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}
