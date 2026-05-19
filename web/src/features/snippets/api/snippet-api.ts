import {
  CREATE_SNIPPET_FUNCTION_NAME,
  DELETE_SNIPPET_FUNCTION_NAME,
  UPDATE_SNIPPET_FUNCTION_NAME,
} from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { SnippetDeleteInput, SnippetMutation } from '@/shared/types'

export interface SnippetRow {
  id: string
  user_id: string
  text: string
  language: string
  created_at: string
  updated_at: string
}

export interface SnippetMutationResponse {
  snippet: SnippetRow & { tags?: unknown[] }
}

/**
 * Reads the authenticated user id used to scope direct browser queries.
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('auth_required')
  return user.id
}

/**
 * Fetches one page of snippet rows with PostgREST count metadata but without tags attached yet.
 */
export async function listSnippetRows(
  filters: {
    search?: string
    languages?: string[]
    filteredSnippetIds?: string[] | null
    order?: 'newest' | 'oldest'
  },
  page: number,
  pageSize: number,
): Promise<{ count: number; rows: SnippetRow[] }> {
  let query = supabase
    .from('snippets')
    .select('id, user_id, text, language, created_at, updated_at', { count: 'exact' })

  if (filters.search?.trim()) {
    query = query.ilike('text', `%${filters.search.trim()}%`)
  }

  if (filters.languages?.length) {
    query = query.in('language', filters.languages)
  }

  if (filters.filteredSnippetIds) {
    query = query.in('id', filters.filteredSnippetIds)
  }

  query = query.order('created_at', { ascending: (filters.order ?? 'newest') === 'oldest' })

  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error) throw error
  return { count: count ?? 0, rows: (data ?? []) as SnippetRow[] }
}

/**
 * Loads one snippet row without tag joins so repositories can assemble the final model shape.
 */
export async function getSnippetRow(snippetId: string): Promise<SnippetRow | null> {
  const { data, error } = await supabase
    .from('snippets')
    .select('id, user_id, text, language, created_at, updated_at')
    .eq('id', snippetId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Loads the distinct snippet languages owned by the current user for search filter options.
 */
export async function listSnippetLanguageCodes(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('snippets')
    .select('language')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.language).filter(Boolean)
}

/**
 * Invokes the create-snippet Edge Function and returns the raw response payload.
 */
export async function createSnippetRow(input: SnippetMutation): Promise<SnippetMutationResponse> {
  const { data, error } = await supabase.functions.invoke<SnippetMutationResponse>(
    CREATE_SNIPPET_FUNCTION_NAME,
    { body: input },
  )

  if (error) throw error
  if (!data?.snippet) throw new Error('create-snippet returned no snippet')
  return data
}

/**
 * Invokes the update-snippet Edge Function and returns the raw response payload.
 */
export async function updateSnippetRow(
  snippetId: string,
  input: SnippetMutation,
): Promise<SnippetMutationResponse> {
  const { data, error } = await supabase.functions.invoke<SnippetMutationResponse>(
    UPDATE_SNIPPET_FUNCTION_NAME,
    { body: { snippetId, ...input } },
  )

  if (error) throw error
  if (!data?.snippet) throw new Error('update-snippet returned no snippet')
  return data
}

/**
 * Invokes the delete-snippet Edge Function using either id deletion or the extension compatibility payload.
 */
export async function deleteSnippetRow(input: SnippetDeleteInput | string): Promise<void> {
  const payload = typeof input === 'string' ? { snippetId: input } : input
  const { error } = await supabase.functions.invoke(DELETE_SNIPPET_FUNCTION_NAME, {
    body: payload,
  })

  if (error) throw error
}
