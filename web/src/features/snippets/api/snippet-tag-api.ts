import { supabase } from '@/lib/supabase'

export interface SnippetTagRow {
  snippet_id: string
  tag_id: string
}

/**
 * Loads snippet_tag join rows for the given snippets so repositories can rebuild nested tag arrays.
 */
export async function listSnippetTagRows(snippetIds: string[]): Promise<SnippetTagRow[]> {
  if (!snippetIds.length) return []

  const { data, error } = await supabase
    .from('snippet_tags')
    .select('snippet_id, tag_id')
    .in('snippet_id', snippetIds)

  if (error) throw error
  return data ?? []
}

/**
 * Resolves snippet-tag mappings for the selected tag ids before pagination runs on the snippets table.
 */
export async function listSnippetTagRowsByTagIds(tagIds: string[]): Promise<SnippetTagRow[]> {
  if (!tagIds.length) return []

  const { data, error } = await supabase
    .from('snippet_tags')
    .select('snippet_id, tag_id')
    .in('tag_id', tagIds)

  if (error) throw error
  return (data ?? []) as SnippetTagRow[]
}
