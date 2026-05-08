import { getSettings } from './settings'
import { supabaseFetch } from './supabase'

export async function saveSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()
  if (!settings.accessToken) return { error: 'Not signed in' }

  const res = await supabaseFetch(settings, '/functions/v1/create-snippet', {
    method: 'POST',
    body: JSON.stringify({ text, language, tagNames: [] }),
  })

  return res.ok ? { success: true } : { error: `Save failed: ${res.status}` }
}

export async function deleteSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()
  if (!settings.accessToken) return { error: 'Not signed in' }

  const res = await supabaseFetch(settings, '/functions/v1/delete-snippet', {
    method: 'POST',
    body: JSON.stringify({ text, language }),
  })

  return res.ok ? { success: true } : { error: `Delete failed: ${res.status}` }
}
