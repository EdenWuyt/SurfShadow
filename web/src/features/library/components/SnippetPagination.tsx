import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import type { SnippetPage } from '@/shared/types'

interface SnippetPaginationProps {
  onPageChange: (page: number) => void
  page: SnippetPage
}

type PaginationToken = number | 'ellipsis'

function getVisiblePages(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage])

  if (currentPage <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  } else if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
  } else {
    pages.add(currentPage - 1)
    pages.add(currentPage + 1)
  }

  const sortedPages = Array.from(pages)
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((left, right) => left - right)

  const tokens: PaginationToken[] = []
  for (let index = 0; index < sortedPages.length; index += 1) {
    const pageNumber = sortedPages[index]
    const previousPageNumber = sortedPages[index - 1]

    if (index > 0 && pageNumber - previousPageNumber > 1) {
      tokens.push('ellipsis')
    }

    tokens.push(pageNumber)
  }

  return tokens
}

export function SnippetPagination({ onPageChange, page }: SnippetPaginationProps): JSX.Element | null {
  if (page.totalPages <= 1) return null

  return (
    <div className="bg-[color:var(--bg)]">
      <nav
        aria-label="Snippet pagination"
        className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 md:px-0"
      >
        <Button
          className="shrink-0"
          disabled={page.page <= 1}
          onClick={() => onPageChange(page.page - 1)}
          size="sm"
          variant="outline"
        >
          Prev
        </Button>
        <div className="flex min-w-0 items-center justify-center gap-1 overflow-x-auto whitespace-nowrap">
          {getVisiblePages(page.page, page.totalPages).map((token, index) =>
            token === 'ellipsis' ? (
              <span
                className="text-muted flex h-8 w-8 shrink-0 items-center justify-center text-sm"
                key={`ellipsis-${index}`}
              >
                ...
              </span>
            ) : (
              <Button
                className="shrink-0"
                key={token}
                onClick={() => onPageChange(token)}
                size="sm"
                variant={token === page.page ? 'default' : 'secondary'}
              >
                {token}
              </Button>
            ),
          )}
        </div>
        <Button
          className="shrink-0"
          disabled={page.page >= page.totalPages}
          onClick={() => onPageChange(page.page + 1)}
          size="sm"
          variant="outline"
        >
          Next
        </Button>
      </nav>
    </div>
  )
}
