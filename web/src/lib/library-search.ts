import type { SnippetFilters, SnippetSortOrder } from '@/shared/types'
import { sanitizeInlineText, sanitizeLanguageCode, sanitizeSnippetSortOrder } from '@/lib/sanitize'

export function getLibraryFiltersFromSearchParams(searchParams: URLSearchParams): SnippetFilters {
  return {
    search: sanitizeInlineText(searchParams.get('q') ?? ''),
    languages: Array.from(
      new Set(searchParams.getAll('language').map((value) => sanitizeLanguageCode(value)).filter(Boolean)),
    ).sort(),
    tagIds: Array.from(new Set(searchParams.getAll('tag').map((value) => value.trim()).filter(Boolean))).sort(),
    order: sanitizeSnippetSortOrder(searchParams.get('order') ?? 'newest'),
  }
}

export function updateLibrarySearchParams(
  current: URLSearchParams,
  next: SnippetFilters & { page?: number },
): URLSearchParams {
  const params = new URLSearchParams(current)
  const search = sanitizeInlineText(next.search ?? '')
  const languages = Array.from(new Set((next.languages ?? []).map(sanitizeLanguageCode).filter(Boolean))).sort()
  const order = sanitizeSnippetSortOrder(next.order ?? 'newest')
  const tagIds = Array.from(new Set((next.tagIds ?? []).map((value) => value.trim()).filter(Boolean))).sort()
  const page = next.page ?? 1

  if (search) params.set('q', search)
  else params.delete('q')

  params.delete('language')
  for (const language of languages) {
    params.append('language', language)
  }

  params.delete('tag')
  for (const tagId of tagIds) {
    params.append('tag', tagId)
  }

  if (order !== 'newest') params.set('order', order)
  else params.delete('order')

  if (page > 1) params.set('page', String(page))
  else params.delete('page')

  return params
}

export function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export function getOrderOptions(): Array<{ label: string; value: SnippetSortOrder }> {
  return [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
  ]
}
