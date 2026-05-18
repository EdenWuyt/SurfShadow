// Implements background snippet save, delete, and existence-check flows.
import { getSettings } from './settings'
import { isUnauthorizedStatus, readErrorMessage } from './response'
import { buildSnippetLookupPath } from './snippet-paths'
import { supabaseFetch } from './supabase'

export async function saveSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  return runSnippetMutation('/functions/v1/create-snippet', {
    text,
    language,
    tagNames: [],
  }, 'Save failed')
}

export async function deleteSnippet(
  text: string,
  language: string,
): Promise<{ success: true } | { error: string }> {
  return runSnippetMutation('/functions/v1/delete-snippet', {
    text,
    language,
  }, 'Delete failed')
}

export async function checkSnippetSaved(
  text: string,
  language: string,
): Promise<{ saved: boolean } | { error: string }> {
  const settings = await getSettings()

  const res = await supabaseFetch(settings, buildSnippetLookupPath(text, language), {
    method: 'GET',
  })

  if (isUnauthorizedStatus(res.status)) return { error: 'auth_required' }
  if (!res.ok) {
    return { error: await readErrorMessage(res, `Lookup failed: ${res.status}`) }
  }

  const rows = await res.json() as Array<{ id: string }>
  return { saved: rows.length > 0 }
}

async function runSnippetMutation(
  path: string,
  payload: Record<string, unknown>,
  fallbackLabel: string,
): Promise<{ success: true } | { error: string }> {
  const settings = await getSettings()
  const res = await supabaseFetch(settings, path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (res.ok) return { success: true }
  if (isUnauthorizedStatus(res.status)) return { error: 'auth_required' }
  return { error: await readErrorMessage(res, `${fallbackLabel}: ${res.status}`) }
}
