import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { renderWithProviders } from '../utils/render'

describe('ConfirmDialog', () => {
  it('renders title, description, preview content, and inline errors', () => {
    renderWithProviders(
      <ConfirmDialog
        description="Delete this item for good."
        errorMessage="Delete failed"
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        title="Delete item?"
      >
        <div>Preview block</div>
      </ConfirmDialog>,
    )

    expect(screen.getByText('Delete item?')).toBeInTheDocument()
    expect(screen.getByText('Delete this item for good.')).toBeInTheDocument()
    expect(screen.getByText('Preview block')).toBeInTheDocument()
    expect(screen.getByText('Delete failed')).toBeInTheDocument()
  })

  it('calls cancel and confirm actions', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ConfirmDialog onConfirm={onConfirm} onOpenChange={onOpenChange} open title="Delete item?" />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).toHaveBeenCalled()
  })

  it('shows the pending label when the confirm action is in progress', () => {
    renderWithProviders(
      <ConfirmDialog
        isPending
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        title="Delete item?"
      />,
    )

    expect(screen.getByRole('button', { name: 'Confirming...' })).toBeDisabled()
  })
})
