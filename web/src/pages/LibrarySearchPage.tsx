import type { JSX } from 'react'
import { ExpandableFilterSection } from '@/features/library/components/search/ExpandableFilterSection'
import { LanguageChoices } from '@/features/library/components/search/LanguageChoices'
import { SearchField } from '@/features/library/components/search/SearchField'
import { TagChoices } from '@/features/library/components/search/TagChoices'
import { useLibrarySearchDraft } from '@/features/library/hooks/use-library-search-draft'
import { Button } from '@/components/ui/button'
import { searchFooterClass } from '@/styles/recipes'

export default function LibrarySearchPage(): JSX.Element {
  const {
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
  } = useLibrarySearchDraft()

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-2 sm:pt-3">
      <div className="flex-1 space-y-5 overflow-y-auto pb-24">
        <SearchField onChange={setDraftSearch} value={draftSearch} />

        <ExpandableFilterSection title="Languages">
          <LanguageChoices
            languages={languagesQuery.data ?? []}
            onSelectAll={selectAllLanguages}
            onToggle={toggleLanguage}
            selectedCodes={draftLanguages}
          />
        </ExpandableFilterSection>

        <ExpandableFilterSection title="Tags">
          <TagChoices
            onSelectAll={selectAllTags}
            onToggle={toggleTagFilter}
            selectedTagIds={draftTagIds}
            tags={tagsQuery.data ?? []}
          />
        </ExpandableFilterSection>
      </div>

      <div className={searchFooterClass}>
        <div className="grid grid-cols-2 gap-2">
          <Button className="w-full" onClick={cancel} size="sm" variant="ghost">
            Cancel
          </Button>
          <Button className="w-full" onClick={applyFilters} size="lg">
            Apply
          </Button>
        </div>
      </div>
    </section>
  )
}
