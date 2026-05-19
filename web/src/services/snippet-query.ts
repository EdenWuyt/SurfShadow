import type { SnippetFilters } from '@/shared/types'

// Query keys normalize caller input so equivalent filter objects reuse the same cache entry.
function normalizeFilters(filters: SnippetFilters = {}, page = 1, pageSize = 8) {
  return {
    search: filters.search?.trim() || '',
    languages: [...(filters.languages ?? [])].sort(),
    tagIds: [...(filters.tagIds ?? [])].sort(),
    order: filters.order ?? 'newest',
    page,
    pageSize,
  }
}

export const snippetQueryKeys = {
  all: ['snippets'] as const,
  list: (filters: SnippetFilters = {}, page = 1, pageSize = 8) =>
    ['snippets', 'list', normalizeFilters(filters, page, pageSize)] as const,
  detail: (snippetId: string) => ['snippets', 'detail', snippetId] as const,
  tags: ['snippets', 'tags'] as const,
}
