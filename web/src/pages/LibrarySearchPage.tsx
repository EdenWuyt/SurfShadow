import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExpandableFilterSection } from '@/components/library/search/ExpandableFilterSection'
import { LanguageChoices } from '@/components/library/search/LanguageChoices'
import { SearchField } from '@/components/library/search/SearchField'
import { TagChoices } from '@/components/library/search/TagChoices'
import { Button } from '@/components/ui/button'
import {
  getLibraryFiltersFromSearchParams,
  updateLibrarySearchParams,
} from '@/lib/library-search'
import { sanitizeInlineText } from '@/lib/sanitize'
import { snippetQueryKeys } from '@/services/snippet-query'
import { listSnippetLanguages, listTags } from '@/services/snippet-service'
import { searchFooterClass } from '@/styles/recipes'

export default function LibrarySearchPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => getLibraryFiltersFromSearchParams(searchParams), [searchParams])
  const [draftSearch, setDraftSearch] = useState(filters.search ?? '')
  const [draftLanguages, setDraftLanguages] = useState<string[]>(filters.languages ?? [])
  const [draftTagIds, setDraftTagIds] = useState<string[]>(filters.tagIds ?? [])

  // Search page keeps a draft copy of the URL filters so the bottom actions can cancel or commit the whole form.
  useEffect(() => {
    setDraftSearch(filters.search ?? '')
    setDraftLanguages(filters.languages ?? [])
    setDraftTagIds(filters.tagIds ?? [])
  }, [filters])

  const languagesQuery = useQuery({
    queryKey: [...snippetQueryKeys.all, 'languages'],
    queryFn: listSnippetLanguages,
  })

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listTags,
  })

  function applyFilters(): void {
    const availableLanguageCodes = (languagesQuery.data ?? []).map((language) => language.code)
    const availableTagIds = (tagsQuery.data ?? []).map((tag) => tag.id)
    const nextParams = updateLibrarySearchParams(searchParams, {
      ...filters,
      search: sanitizeInlineText(draftSearch),
      languages:
        draftLanguages.length === availableLanguageCodes.length ? [] : draftLanguages,
      tagIds:
        draftTagIds.length === availableTagIds.length ? [] : draftTagIds,
      page: 1,
    })
    setSearchParams(nextParams)
    navigate({ pathname: '/', search: nextParams.toString() })
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

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-2 sm:pt-3">
      <div className="flex-1 space-y-5 overflow-y-auto pb-24">
        <SearchField onChange={setDraftSearch} value={draftSearch} />

        <ExpandableFilterSection title="Languages">
          <LanguageChoices
            languages={languagesQuery.data ?? []}
            onSelectAll={() =>
              setDraftLanguages((current) => {
                const allCodes = (languagesQuery.data ?? []).map((language) => language.code)
                return current.length === allCodes.length ? [] : allCodes
              })}
            onToggle={toggleLanguage}
            selectedCodes={draftLanguages}
          />
        </ExpandableFilterSection>

        <ExpandableFilterSection title="Tags">
          <TagChoices
            onSelectAll={() =>
              setDraftTagIds((current) => {
                const allTagIds = (tagsQuery.data ?? []).map((tag) => tag.id)
                return current.length === allTagIds.length ? [] : allTagIds
              })}
            onToggle={toggleTagFilter}
            selectedTagIds={draftTagIds}
            tags={tagsQuery.data ?? []}
          />
        </ExpandableFilterSection>
      </div>

      <div className={searchFooterClass}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="w-full"
            onClick={() => navigate({ pathname: '/', search: searchParams.toString() })}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button className="w-full" onClick={applyFilters} size="sm">
            Apply
          </Button>
        </div>
      </div>
    </section>
  )
}
