import { supabase } from '@/lib/supabase'
import { LANGUAGES } from '@/shared/languages'
import type { Profile } from '@/shared/types'

function resolveDefaultLanguage(language?: string): string {
  if (language && LANGUAGES.some((item) => item.code === language)) return language
  return LANGUAGES[0]?.code ?? 'en-US'
}

export async function ensureCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return null

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id, default_language, quota_used, quota_reset_at, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing

  const defaultLanguage = resolveDefaultLanguage()

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      default_language: defaultLanguage,
    })
    .select('id, default_language, quota_used, quota_reset_at, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}
