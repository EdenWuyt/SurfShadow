import type { JSX } from 'react'
import { SnippetLibraryCard } from '@/features/library/components/SnippetLibraryCard'
import { SnippetPagination } from '@/features/library/components/SnippetPagination'
import { useLibraryPage } from '@/features/library/hooks/use-library-page'
import { Card, CardContent } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { PageMessage } from '@/components/ui/page-message'
import { Select } from '@/components/ui/select'
import { getOrderOptions } from '@/features/library/lib/library-search'
import { compactSelectClass, pageMetaClass } from '@/styles/recipes'

export default function LibraryPage(): JSX.Element {
  const {
    activePlayback,
    deleteError,
    deleting,
    loading,
    onDelete,
    onOrderChange,
    onPageChange,
    onPlay,
    order,
    queryError,
    snippets,
    snippetsPage,
    totalCount,
    totalPages,
  } = useLibraryPage()

  return (
    <section className="grid gap-4">
      {loading ? <PageMessage>Loading snippets...</PageMessage> : null}
      {queryError ? (
        <PageMessage variant="error">
          {queryError instanceof Error ? queryError.message : 'Failed to load snippets'}
        </PageMessage>
      ) : null}
      {deleteError ? <Notice variant="error">{deleteError}</Notice> : null}

      <div className="flex items-center justify-between gap-3">
        <p className={pageMetaClass}>
          {totalCount} snippets in total
        </p>
        <label className={`flex items-center gap-2 ${pageMetaClass}`}>
          <span>Order</span>
          <Select
            className={compactSelectClass}
            onChange={(event) => onOrderChange(event.target.value)}
            value={order}
          >
            {getOrderOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snippets.map((snippet) => (
          <SnippetLibraryCard
            activePlayback={activePlayback}
            deleting={deleting}
            key={snippet.id}
            onDelete={onDelete}
            onPlay={onPlay}
            snippet={snippet}
          />
        ))}
      </div>

      {!loading && !snippets.length ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="font-serif text-2xl text-[color:var(--foreground)]">No snippets yet</h3>
            <PageMessage>
              Start with a new snippet or import text from an image to build your practice library.
            </PageMessage>
          </CardContent>
        </Card>
      ) : null}

      {totalPages > 1 ? <SnippetPagination onPageChange={onPageChange} page={snippetsPage!} /> : null}
    </section>
  )
}
