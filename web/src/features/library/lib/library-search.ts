import type { SnippetFilters, SnippetSortOrder } from '@/shared/types'
import { sanitizeInlineText, sanitizeLanguageCode, sanitizeSnippetSortOrder } from '@/lib/sanitize'

/**
 * Parses the library page URL contract into sanitized filters that both library screens can share.
 */
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

/**
 * Rebuilds the library URL from the next filter state while dropping default values from the query string.
 */
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

  // Full-selection collapses back to the unfiltered URL so "all selected" behaves the same as no filter.
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

/**
 * Normalizes the page query param so pagination stays positive and resilient to malformed URLs.
 */
export function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

/**
 * Provides the stable sort choices rendered by the library list controls.
 */
export function getOrderOptions(): Array<{ label: string; value: SnippetSortOrder }> {
  return [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
  ]
}
