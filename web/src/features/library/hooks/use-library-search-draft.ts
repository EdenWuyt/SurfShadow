import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getLibraryFiltersFromSearchParams, updateLibrarySearchParams } from '@/features/library/lib/library-search'
import { sanitizeInlineText } from '@/lib/sanitize'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { listSavedSnippetLanguages } from '@/features/snippets/repositories/snippet-repository'
import { listSavedTags } from '@/features/tags/repositories/tag-repository'
import type { Tag } from '@/shared/types'

interface UseLibrarySearchDraftResult {
  draftLanguages: string[]
  draftSearch: string
  draftTagIds: string[]
  languagesQuery: ReturnType<typeof useQuery<{ code: string; label: string }[]>>
  tagsQuery: UseQueryResult<Tag[]>
  applyFilters: () => void
  cancel: () => void
  setDraftSearch: (value: string) => void
  toggleLanguage: (code: string) => void
  toggleTagFilter: (tagId: string) => void
  selectAllLanguages: () => void
  selectAllTags: () => void
}

/**
 * Keeps search filters in a local draft so the search page can cancel or apply the whole form at once.
 */
export function useLibrarySearchDraft(): UseLibrarySearchDraftResult {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => getLibraryFiltersFromSearchParams(searchParams), [searchParams])
  const [draftSearch, setDraftSearch] = useState(filters.search ?? '')
  const [draftLanguages, setDraftLanguages] = useState<string[]>(filters.languages ?? [])
  const [draftTagIds, setDraftTagIds] = useState<string[]>(filters.tagIds ?? [])

  useEffect(() => {
    setDraftSearch(filters.search ?? '')
    setDraftLanguages(filters.languages ?? [])
    setDraftTagIds(filters.tagIds ?? [])
  }, [filters])

  const languagesQuery = useQuery({
    queryKey: [...snippetQueryKeys.all, 'languages'],
    queryFn: listSavedSnippetLanguages,
  })

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listSavedTags,
  })

  /**
   * Applies the draft filters back into the URL and collapses full selection back to the unfiltered state.
   */
  function applyFilters(): void {
    const availableLanguageCodes = (languagesQuery.data ?? []).map((language) => language.code)
    const availableTagIds = (tagsQuery.data ?? []).map((tag) => tag.id)
    const nextParams = updateLibrarySearchParams(searchParams, {
      ...filters,
      search: sanitizeInlineText(draftSearch),
      languages: draftLanguages.length === availableLanguageCodes.length ? [] : draftLanguages,
      tagIds: draftTagIds.length === availableTagIds.length ? [] : draftTagIds,
      page: 1,
    })

    setSearchParams(nextParams)
    navigate({ pathname: '/', search: nextParams.toString() })
  }

  /**
   * Leaves the current URL untouched and returns to the library list.
   */
  function cancel(): void {
    navigate({ pathname: '/', search: searchParams.toString() })
  }

  function toggleTagFilter(tagId: string): void {
    setDraftTagIds((current) =>
      current.includes(tagId) ? current.filter((existingTagId) => existingTagId !== tagId) : [...current, tagId],
    )
  }

  function toggleLanguage(code: string): void {
    setDraftLanguages((current) =>
      current.includes(code) ? current.filter((existingCode) => existingCode !== code) : [...current, code],
    )
  }

  function selectAllLanguages(): void {
    setDraftLanguages((current) => {
      const allCodes = (languagesQuery.data ?? []).map((language) => language.code)
      return current.length === allCodes.length ? [] : allCodes
    })
  }

  function selectAllTags(): void {
    setDraftTagIds((current) => {
      const allTagIds = (tagsQuery.data ?? []).map((tag) => tag.id)
      return current.length === allTagIds.length ? [] : allTagIds
    })
  }

  return {
    applyFilters,
    cancel,
    draftLanguages,
    draftSearch,
    draftTagIds,
    languagesQuery,
    selectAllLanguages,
    selectAllTags,
    setDraftSearch,
    tagsQuery,
    toggleLanguage,
    toggleTagFilter,
  }
}
