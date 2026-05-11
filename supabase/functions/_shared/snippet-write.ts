import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

interface SnippetRow {
  id: string
  user_id: string
  text: string
  language: string
  created_at: string
  updated_at: string
}

interface TagRow {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

interface SnippetTagRow {
  snippet_id: string
  tag_id: string
}

export interface SnippetPayload {
  id: string
  user_id: string
  text: string
  language: string
  created_at: string
  updated_at: string
  tags: TagRow[]
}

export interface SnippetInput {
  text: string
  language: string
  tagNames?: string[]
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const MULTI_SPACE = /[ \t]+/g
const MULTI_BLANK_LINES = /\n{3,}/g
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

export function getServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey)
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}

export function corsPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null

  return new Response('ok', {
    headers: CORS_HEADERS,
  })
}

function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, '')
}

export function normalizeText(text: string): string {
  return stripControlChars(text)
    .replace(/\r\n/g, '\n')
    .replace(MULTI_SPACE, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(MULTI_BLANK_LINES, '\n\n')
    .trim()
}

export function normalizeLanguage(language: string): string {
  return stripControlChars(language).trim()
}

export function normalizeTagNames(tagNames: string[]): string[] {
  return Array.from(
    new Set(
      tagNames
        .map((tagName) =>
          stripControlChars(tagName)
            .replace(MULTI_SPACE, ' ')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  )
}

export async function requireUserId(request: Request): Promise<string> {
  const authorization = request.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    throw new Error('auth_required')
  }

  const token = authorization.slice('Bearer '.length).trim()
  const supabase = getServiceClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('auth_required')
  }

  return data.user.id
}

async function listSnippetTagRows(
  supabase: SupabaseClient,
  snippetIds: string[],
): Promise<SnippetTagRow[]> {
  if (!snippetIds.length) return []

  const { data, error } = await supabase
    .from('snippet_tags')
    .select('snippet_id, tag_id')
    .in('snippet_id', snippetIds)

  if (error) throw error
  return data ?? []
}

async function listTagsByIds(supabase: SupabaseClient, tagIds: string[]): Promise<TagRow[]> {
  if (!tagIds.length) return []

  const { data, error } = await supabase
    .from('tags')
    .select('id, user_id, name, created_at, updated_at')
    .in('id', tagIds)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

function attachTags(snippet: SnippetRow, snippetTags: SnippetTagRow[], tags: TagRow[]): SnippetPayload {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
  const resolvedTags = Array.from(
    new Set(
      snippetTags
        .filter((snippetTag) => snippetTag.snippet_id === snippet.id)
        .map((snippetTag) => snippetTag.tag_id),
    ),
  )
    .map((tagId) => tagsById.get(tagId))
    .filter((tag): tag is TagRow => Boolean(tag))
    .sort((left, right) => left.name.localeCompare(right.name))

  return {
    ...snippet,
    tags: resolvedTags,
  }
}

export async function hydrateSnippet(supabase: SupabaseClient, snippetId: string): Promise<SnippetPayload> {
  const { data, error } = await supabase
    .from('snippets')
    .select('id, user_id, text, language, created_at, updated_at')
    .eq('id', snippetId)
    .single()

  if (error) throw error

  const snippet = data as SnippetRow
  const snippetTags = await listSnippetTagRows(supabase, [snippetId])
  const tags = await listTagsByIds(
    supabase,
    Array.from(new Set(snippetTags.map((snippetTag) => snippetTag.tag_id))),
  )

  return attachTags(snippet, snippetTags, tags)
}

export async function ensureTags(
  supabase: SupabaseClient,
  userId: string,
  tagNames: string[],
): Promise<TagRow[]> {
  const normalizedTagNames = normalizeTagNames(tagNames)
  if (!normalizedTagNames.length) return []

  const { data: existingTags, error: existingError } = await supabase
    .from('tags')
    .select('id, user_id, name, created_at, updated_at')
    .eq('user_id', userId)
    .in('name', normalizedTagNames)

  if (existingError) throw existingError

  const existingByName = new Map((existingTags ?? []).map((tag) => [tag.name, tag]))
  const missingTagNames = normalizedTagNames.filter((tagName) => !existingByName.has(tagName))

  let insertedTags: TagRow[] = []
  if (missingTagNames.length) {
    const { data, error } = await supabase
      .from('tags')
      .insert(missingTagNames.map((name) => ({ user_id: userId, name })))
      .select('id, user_id, name, created_at, updated_at')

    if (error) throw error
    insertedTags = data ?? []
  }

  const allTags = [...(existingTags ?? []), ...insertedTags]
  const allTagsByName = new Map(allTags.map((tag) => [tag.name, tag]))
  return normalizedTagNames
    .map((tagName) => allTagsByName.get(tagName))
    .filter((tag): tag is TagRow => Boolean(tag))
}

export async function replaceSnippetTags(
  supabase: SupabaseClient,
  snippetId: string,
  tagIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('snippet_tags')
    .delete()
    .eq('snippet_id', snippetId)

  if (deleteError) throw deleteError

  if (!tagIds.length) return

  const { error: insertError } = await supabase
    .from('snippet_tags')
    .insert(tagIds.map((tagId) => ({ snippet_id: snippetId, tag_id: tagId })))

  if (insertError) throw insertError
}

export async function findDuplicateSnippet(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  language: string,
): Promise<SnippetRow | null> {
  const { data, error } = await supabase
    .from('snippets')
    .select('id, user_id, text, language, created_at, updated_at')
    .eq('user_id', userId)
    .eq('text', text)
    .eq('language', language)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as SnippetRow | null) ?? null
}
