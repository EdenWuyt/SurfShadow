import {
  CREATE_SNIPPET_FUNCTION_NAME,
  DELETE_SNIPPET_FUNCTION_NAME,
  UPDATE_SNIPPET_FUNCTION_NAME,
} from '@/lib/config'
import { sanitizeSnippetFilters, sanitizeSnippetMutation } from '@/lib/sanitize'
import { supabase } from '@/lib/supabase'
import { getLanguageLabel } from '@/shared/languages'
import type {
  Language,
  Snippet,
  SnippetDeleteInput,
  SnippetFilters,
  SnippetMutation,
  SnippetPage,
  Tag,
} from '@/shared/types'

interface SnippetRow {
  id: string
  user_id: string
  text: string
  language: string
  created_at: string
  updated_at: string
}

interface SnippetTagRow {
  snippet_id: string
  tag_id: string
}

interface SnippetMutationResponse {
  snippet: Snippet
}

function uniqueTagIds(tagIds: string[]): string[] {
  return Array.from(new Set(tagIds.filter(Boolean)))
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('auth_required')
  return user.id
}

async function listSnippetTagRows(snippetIds: string[]): Promise<SnippetTagRow[]> {
  if (!snippetIds.length) return []

  const { data, error } = await supabase
    .from('snippet_tags')
    .select('snippet_id, tag_id')
    .in('snippet_id', snippetIds)

  if (error) throw error
  return data ?? []
}

async function listTagsByIds(tagIds: string[]): Promise<Tag[]> {
  if (!tagIds.length) return []

  const { data, error } = await supabase
    .from('tags')
    .select('id, user_id, name, created_at, updated_at')
    .in('id', tagIds)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

function attachTags(snippets: SnippetRow[], snippetTags: SnippetTagRow[], tags: Tag[]): Snippet[] {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
  const tagIdsBySnippetId = new Map<string, string[]>()

  for (const snippetTag of snippetTags) {
    const existing = tagIdsBySnippetId.get(snippetTag.snippet_id) ?? []
    existing.push(snippetTag.tag_id)
    tagIdsBySnippetId.set(snippetTag.snippet_id, existing)
  }

  return snippets.map((snippet) => ({
    ...snippet,
    tags: uniqueTagIds(tagIdsBySnippetId.get(snippet.id) ?? [])
      .map((tagId) => tagsById.get(tagId))
      .filter((tag): tag is Tag => Boolean(tag))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }))
}

async function resolveSnippetIdsForTagFilter(tagIds: string[]): Promise<string[]> {
  if (!tagIds.length) return []

  const { data, error } = await supabase
    .from('snippet_tags')
    .select('snippet_id, tag_id')
    .in('tag_id', tagIds)

  if (error) throw error

  const counts = new Map<string, Set<string>>()
  for (const row of (data ?? []) as SnippetTagRow[]) {
    const current = counts.get(row.snippet_id) ?? new Set<string>()
    current.add(row.tag_id)
    counts.set(row.snippet_id, current)
  }

  return Array.from(counts.entries())
    .filter(([, matchedTagIds]) => matchedTagIds.size === tagIds.length)
    .map(([snippetId]) => snippetId)
}

async function invokeSnippetMutation<TBody extends object>(
  functionName: string,
  body: TBody,
): Promise<SnippetMutationResponse> {
  const { data, error } = await supabase.functions.invoke<SnippetMutationResponse>(functionName, {
    body,
  })

  if (error) throw error
  if (!data?.snippet) throw new Error(`${functionName} returned no snippet`)
  return data
}

export async function listTags(): Promise<Tag[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('tags')
    .select('id, user_id, name, created_at, updated_at')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function listSnippetLanguages(): Promise<Array<Pick<Language, 'code' | 'label'>>> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('snippets')
    .select('language')
    .eq('user_id', userId)

  if (error) throw error

  return Array.from(new Set((data ?? []).map((row) => row.language).filter(Boolean)))
    .sort((left, right) => getLanguageLabel(left).localeCompare(getLanguageLabel(right)))
    .map((code) => ({ code, label: getLanguageLabel(code) }))
}

export async function updateTag(tagId: string, name: string): Promise<Tag> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('tags')
    .update({ name })
    .eq('id', tagId)
    .eq('user_id', userId)
    .select('id, user_id, name, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteTag(tagId: string): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function listSnippets(
  filters: SnippetFilters = {},
  page = 1,
  pageSize = 8,
): Promise<SnippetPage> {
  const sanitizedFilters = sanitizeSnippetFilters(filters)
  const selectedTagIds = uniqueTagIds(sanitizedFilters.tagIds ?? [])
  let filteredSnippetIds: string[] | null = null

  if (selectedTagIds.length) {
    filteredSnippetIds = await resolveSnippetIdsForTagFilter(selectedTagIds)
    if (!filteredSnippetIds.length) {
      return {
        items: [],
        page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
      }
    }
  }

  let query = supabase
    .from('snippets')
    .select('id, user_id, text, language, created_at, updated_at', { count: 'exact' })

  if (sanitizedFilters.search?.trim()) {
    query = query.ilike('text', `%${sanitizedFilters.search.trim()}%`)
  }

  if (sanitizedFilters.languages?.length) {
    query = query.in('language', sanitizedFilters.languages)
  }

  if (filteredSnippetIds) {
    query = query.in('id', filteredSnippetIds)
  }

  query = query.order('created_at', { ascending: (sanitizedFilters.order ?? 'newest') === 'oldest' })

  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1
  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const snippets = (data ?? []) as SnippetRow[]
  const snippetIds = snippets.map((snippet) => snippet.id)
  const snippetTags = await listSnippetTagRows(snippetIds)
  const tags = await listTagsByIds(uniqueTagIds(snippetTags.map((snippetTag) => snippetTag.tag_id)))
  const totalCount = count ?? 0

  return {
    items: attachTags(snippets, snippetTags, tags),
    page,
    pageSize,
    totalCount,
    totalPages: totalCount ? Math.ceil(totalCount / pageSize) : 0,
  }
}

export async function getSnippet(snippetId: string): Promise<Snippet | null> {
  const { data, error } = await supabase
    .from('snippets')
    .select('id, user_id, text, language, created_at, updated_at')
    .eq('id', snippetId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const snippetTags = await listSnippetTagRows([snippetId])
  const tags = await listTagsByIds(uniqueTagIds(snippetTags.map((snippetTag) => snippetTag.tag_id)))
  return attachTags([data], snippetTags, tags)[0] ?? null
}

export async function createSnippet(input: SnippetMutation): Promise<Snippet> {
  const { snippet } = await invokeSnippetMutation(
    CREATE_SNIPPET_FUNCTION_NAME,
    sanitizeSnippetMutation(input),
  )
  return snippet
}

export async function updateSnippet(snippetId: string, input: SnippetMutation): Promise<Snippet> {
  const { snippet } = await invokeSnippetMutation(UPDATE_SNIPPET_FUNCTION_NAME, {
    snippetId,
    ...sanitizeSnippetMutation(input),
  })
  return snippet
}

export async function deleteSnippet(input: SnippetDeleteInput | string): Promise<void> {
  const payload = typeof input === 'string' ? { snippetId: input } : input
  const { error } = await supabase.functions.invoke(DELETE_SNIPPET_FUNCTION_NAME, {
    body: payload,
  })

  if (error) throw error
}
