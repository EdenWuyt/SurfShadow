import { getUserId } from './jwt'
import { getSettings } from './settings'
import { supabaseFetch } from './supabase'

export async function saveSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()
  if (!settings.accessToken) return { error: 'Not signed in' }

  const userId = getUserId(settings.accessToken)
  const res = await supabaseFetch(settings, '/rest/v1/snippets', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, text, language }),
  })

  return res.ok ? { success: true } : { error: `Save failed: ${res.status}` }
}

export async function deleteSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()
  if (!settings.accessToken) return { error: 'Not signed in' }

  const userId = getUserId(settings.accessToken)
  if (!userId) return { error: 'Not signed in' }

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    text: `eq.${text}`,
    language: `eq.${language}`,
  })

  const res = await supabaseFetch(settings, `/rest/v1/snippets?${params.toString()}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })

  return res.ok ? { success: true } : { error: `Delete failed: ${res.status}` }
}
