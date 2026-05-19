import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SnippetLibraryCard } from '@/components/library/SnippetLibraryCard'
import type { Snippet } from '@/shared/types'
import { renderWithProviders } from '../utils/render'

const snippet: Snippet = {
  id: 'snippet-1',
  user_id: 'user-1',
  text: 'Hello there',
  language: 'en-US',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  tags: [],
}

describe('SnippetLibraryCard', () => {
  it('keeps the delete dialog open and renders the error when deletion fails', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockRejectedValue(new Error('Delete failed'))

    renderWithProviders(
      <SnippetLibraryCard
        activePlayback={null}
        deleting={false}
        onDelete={onDelete}
        onPlay={vi.fn()}
        snippet={snippet}
      />,
    )

    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('snippet-1')
    expect(await screen.findByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByText('Delete snippet?')).toBeInTheDocument()
  })
})
