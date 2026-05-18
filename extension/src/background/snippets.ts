import { getSettings } from './settings'
import { supabaseFetch } from './supabase'

function buildSnippetLookupPath(text: string, language: string): string {
  const params = new URLSearchParams({
    select: 'id',
    text: `eq.${text}`,
    language: `eq.${language}`,
    limit: '1',
  })

  return `/rest/v1/snippets?${params.toString()}`
}

export async function saveSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()

  const res = await supabaseFetch(settings, '/functions/v1/create-snippet', {
    method: 'POST',
    body: JSON.stringify({ text, language, tagNames: [] }),
  })

  if (res.ok) return { success: true }
  if (res.status === 401 || res.status === 403) return { error: 'auth_required' }

  const payload = await res.json().catch(() => null) as { error?: string } | null
  return { error: payload?.error ?? `Save failed: ${res.status}` }
}

export async function deleteSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()

  const res = await supabaseFetch(settings, '/functions/v1/delete-snippet', {
    method: 'POST',
    body: JSON.stringify({ text, language }),
  })

  if (res.ok) return { success: true }
  if (res.status === 401 || res.status === 403) return { error: 'auth_required' }

  const payload = await res.json().catch(() => null) as { error?: string } | null
  return { error: payload?.error ?? `Delete failed: ${res.status}` }
}

export async function checkSnippetSaved(
  text: string,
  language: string,
): Promise<{ saved: boolean } | { error: string }> {
  const settings = await getSettings()

  const res = await supabaseFetch(settings, buildSnippetLookupPath(text, language), {
    method: 'GET',
  })

  if (res.status === 401 || res.status === 403) return { error: 'auth_required' }
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null
    return { error: payload?.error ?? `Lookup failed: ${res.status}` }
  }

  const rows = await res.json() as Array<{ id: string }>
  return { saved: rows.length > 0 }
}
