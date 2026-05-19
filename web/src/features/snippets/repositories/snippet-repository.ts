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
import { sanitizeSnippetFilters, sanitizeSnippetMutation } from '@/lib/sanitize'
import {
  createSnippetRow,
  deleteSnippetRow,
  getAuthenticatedUserId,
  getSnippetRow,
  listSnippetLanguageCodes,
  listSnippetRows,
  type SnippetRow,
  updateSnippetRow,
} from '@/features/snippets/api/snippet-api'
import {
  listSnippetTagRows,
  listSnippetTagRowsByTagIds,
  type SnippetTagRow,
} from '@/features/snippets/api/snippet-tag-api'
import { listTagsByIds } from '@/features/tags/api/tag-api'

function uniqueTagIds(tagIds: string[]): string[] {
  return Array.from(new Set(tagIds.filter(Boolean)))
}

/**
 * Rebuilds the nested snippet tag arrays expected by the UI from the flat snippet/tag join reads.
 */
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

/**
 * Resolves the snippet ids that match every selected tag so pagination can remain on the snippets query.
 */
async function resolveSnippetIdsForTagFilter(tagIds: string[]): Promise<string[]> {
  const rows = await listSnippetTagRowsByTagIds(tagIds)
  const counts = new Map<string, Set<string>>()

  for (const row of rows) {
    const matchedTagIds = counts.get(row.snippet_id) ?? new Set<string>()
    matchedTagIds.add(row.tag_id)
    counts.set(row.snippet_id, matchedTagIds)
  }

  return Array.from(counts.entries())
    .filter(([, matchedTagIds]) => matchedTagIds.size === tagIds.length)
    .map(([snippetId]) => snippetId)
}

/**
 * Loads one page of snippets and assembles tags after direct row reads complete.
 */
export async function listSnippetsPage(
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
      return { items: [], page, pageSize, totalCount: 0, totalPages: 0 }
    }
  }

  const { count, rows } = await listSnippetRows(
    {
      search: sanitizedFilters.search,
      languages: sanitizedFilters.languages,
      filteredSnippetIds,
      order: sanitizedFilters.order,
    },
    page,
    pageSize,
  )

  const snippetTags = await listSnippetTagRows(rows.map((snippet) => snippet.id))
  const tags = await listTagsByIds(uniqueTagIds(snippetTags.map((snippetTag) => snippetTag.tag_id)))

  return {
    items: attachTags(rows, snippetTags, tags),
    page,
    pageSize,
    totalCount: count,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  }
}

/**
 * Loads one snippet with its tags for edit and practice screens.
 */
export async function getSnippetDetail(snippetId: string): Promise<Snippet | null> {
  const snippetRow = await getSnippetRow(snippetId)
  if (!snippetRow) return null

  const snippetTags = await listSnippetTagRows([snippetId])
  const tags = await listTagsByIds(uniqueTagIds(snippetTags.map((snippetTag) => snippetTag.tag_id)))
  return attachTags([snippetRow], snippetTags, tags)[0] ?? null
}

/**
 * Lists only the languages that already exist in the user's snippet library.
 */
export async function listSavedSnippetLanguages(): Promise<Array<Pick<Language, 'code' | 'label'>>> {
  const userId = await getAuthenticatedUserId()
  const codes = await listSnippetLanguageCodes(userId)

  return Array.from(new Set(codes))
    .sort((left, right) => getLanguageLabel(left).localeCompare(getLanguageLabel(right)))
    .map((code) => ({ code, label: getLanguageLabel(code) }))
}

/**
 * Creates one snippet through the Edge Function after client-side normalization.
 */
export async function createSnippetRecord(input: SnippetMutation): Promise<Snippet> {
  const { snippet } = await createSnippetRow(sanitizeSnippetMutation(input))
  return snippet as Snippet
}

/**
 * Updates one snippet through the Edge Function after client-side normalization.
 */
export async function updateSnippetRecord(snippetId: string, input: SnippetMutation): Promise<Snippet> {
  const { snippet } = await updateSnippetRow(snippetId, sanitizeSnippetMutation(input))
  return snippet as Snippet
}

/**
 * Deletes one snippet through the Edge Function.
 */
export async function removeSnippetRecord(input: SnippetDeleteInput | string): Promise<void> {
  await deleteSnippetRow(input)
}
