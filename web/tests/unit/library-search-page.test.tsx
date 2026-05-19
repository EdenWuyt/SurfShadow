import { Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import LibrarySearchPage from '@/pages/LibrarySearchPage'
import { createTestQueryClient } from '../utils/render'

const {
  listSnippetLanguagesMock,
  listTagsMock,
  navigateMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  listSnippetLanguagesMock: vi.fn(),
  listTagsMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/features/snippets/repositories/snippet-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/snippets/repositories/snippet-repository')>(
    '@/features/snippets/repositories/snippet-repository',
  )
  return { ...actual, listSavedSnippetLanguages: listSnippetLanguagesMock }
})

vi.mock('@/features/tags/repositories/tag-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/tags/repositories/tag-repository')>(
    '@/features/tags/repositories/tag-repository',
  )
  return { ...actual, listSavedTags: listTagsMock }
})

function renderSearchPage(route = '/library/search?search=old') {
  const queryClient = createTestQueryClient()

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route element={<div>library</div>} path="/" />
            <Route element={<LibrarySearchPage />} path="/library/search" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('LibrarySearchPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    listSnippetLanguagesMock.mockResolvedValue([
      { code: 'en-US', label: 'English (US)' },
      { code: 'ja-JP', label: 'Japanese' },
    ])
    listTagsMock.mockResolvedValue([
      {
        id: 'tag-1',
        user_id: 'user-1',
        name: 'travel',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      },
    ])
  })

  it('cancels draft changes and navigates back with the current URL state', async () => {
    const user = userEvent.setup()
    renderSearchPage('/library/search?search=old')

    await user.clear(screen.getByPlaceholderText('Search'))
    await user.type(screen.getByPlaceholderText('Search'), 'new query')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(navigateMock).toHaveBeenCalledWith({ pathname: '/', search: 'search=old' })
  })

  it('applies draft search and filters before navigating back to the library', async () => {
    const user = userEvent.setup()
    renderSearchPage('/library/search')

    await user.type(screen.getByPlaceholderText('Search'), '  hello   world  ')
    await user.click(screen.getByRole('button', { name: 'Japanese' }))
    await user.click(screen.getByRole('button', { name: '#travel' }))
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(navigateMock).toHaveBeenCalledWith({
      pathname: '/',
      search: expect.stringContaining('q=hello+world'),
    })
    expect(navigateMock).toHaveBeenCalledWith({
      pathname: '/',
      search: expect.stringContaining('language=ja-JP'),
    })
    expect(navigateMock).toHaveBeenCalledWith({
      pathname: '/',
      search: 'q=hello+world&language=ja-JP',
    })
  })
})
