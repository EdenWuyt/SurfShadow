import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SnippetForm } from '@/features/snippets/components/SnippetForm'
import type { SnippetMutation, Tag } from '@/shared/types'
import { renderWithProviders } from '../utils/render'

const availableTags: Tag[] = [
  {
    id: 'tag-1',
    user_id: 'user-1',
    name: 'greeting',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'tag-2',
    user_id: 'user-1',
    name: 'travel',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
]

const baseValue: SnippetMutation = {
  text: '',
  language: 'en-US',
  tagNames: [],
}

function ControlledSnippetForm(props: Partial<ComponentProps<typeof SnippetForm>>) {
  const [value, setValue] = useState<SnippetMutation>(props.value ?? baseValue)

  return (
    <SnippetForm
      availableTags={availableTags}
      onChange={setValue}
      onSubmit={props.onSubmit ?? vi.fn()}
      submitLabel="Save snippet"
      value={value}
      {...props}
    />
  )
}

describe('SnippetForm', () => {
  it('sanitizes multiline text before updating the draft', async () => {
    const onChange = vi.fn()

    renderWithProviders(
      <SnippetForm
        availableTags={availableTags}
        onChange={onChange}
        onSubmit={vi.fn()}
        submitLabel="Save snippet"
        value={baseValue}
      />,
    )

    fireEvent.change(screen.getByLabelText(/snippet text/i), {
      target: { value: 'Hello   world\r\n\r\n\r\nAgain' },
    })

    expect(onChange).toHaveBeenLastCalledWith({
      language: 'en-US',
      tagNames: [],
      text: 'Hello world\n\nAgain',
    })
  })

  it('adds and removes tags through the form controls', async () => {
    const user = userEvent.setup()

    renderWithProviders(<ControlledSnippetForm />)

    await user.type(screen.getByPlaceholderText(/add a tag/i), 'New Tag{enter}')
    expect(screen.getByRole('button', { name: '#newtag x' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '#travel' }))
    expect(screen.getByRole('button', { name: '#travel x' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '#travel x' }))
    expect(screen.queryByRole('button', { name: '#travel x' })).not.toBeInTheDocument()
  })

  it('renders OCR controls only when enabled and forwards the selected file', async () => {
    const onImageSelected = vi.fn().mockResolvedValue(undefined)

    const { container } = renderWithProviders(
      <SnippetForm
        availableTags={availableTags}
        canUseOcr
        onChange={vi.fn()}
        onImageSelected={onImageSelected}
        onSubmit={vi.fn()}
        submitLabel="Save snippet"
        value={baseValue}
      />,
    )

    expect(screen.getByRole('button', { name: /take image/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload from gallery/i })).toBeInTheDocument()

    const fileInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
    const file = new File(['hello'], 'ocr.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(onImageSelected).toHaveBeenCalledWith(file)
  })

  it('disables save when the snippet text is empty', () => {
    renderWithProviders(
      <SnippetForm
        availableTags={availableTags}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="Save snippet"
        value={baseValue}
      />,
    )

    expect(screen.getByRole('button', { name: /save snippet/i })).toBeDisabled()
  })
})
