import { useRef, useState, type PointerEventHandler } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sanitizeTagName } from '@/lib/sanitize'
import type { Tag } from '@/shared/types'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { removeSavedTag, renameSavedTag } from '@/features/tags/repositories/tag-repository'
import { showError, showSuccess } from '@/stores/feedback-store'

const LONG_PRESS_MS = 500

interface UseEditableTagChipOptions {
  interactive: boolean
  onClick?: () => void
  tag: Tag
}

/**
 * Owns long-press tag editing, query invalidation, and local modal error state for one saved tag chip.
 */
export function useEditableTagChip({ interactive, onClick, tag }: UseEditableTagChipOptions) {
  const queryClient = useQueryClient()
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [draftName, setDraftName] = useState(tag.name)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function invalidateSnippetData(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: snippetQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: snippetQueryKeys.tags }),
    ])
  }

  const updateMutation = useMutation({
    mutationFn: (name: string) => renameSavedTag(tag.id, name),
    onSuccess: async () => {
      await invalidateSnippetData()
      showSuccess('Tag updated.')
      setOpen(false)
    },
    onError: (reason: unknown) => {
      setEditError(reason instanceof Error ? reason.message : 'Unable to update tag')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => removeSavedTag(tag.id),
    onSuccess: async () => {
      await invalidateSnippetData()
      showSuccess('Tag deleted.')
      setConfirmDeleteOpen(false)
      setOpen(false)
    },
    onError: (reason: unknown) => {
      setDeleteError(reason instanceof Error ? reason.message : 'Unable to delete tag')
    },
  })

  function clearLongPress(): void {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  /**
   * Starts the long-press timer so touch devices can still use a single tap for selection.
   */
  const handlePointerDown: PointerEventHandler<HTMLButtonElement> = () => {
    if (!interactive) return
    suppressClickRef.current = false
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      setDraftName(tag.name)
      setEditError(null)
      setDeleteError(null)
      setOpen(true)
    }, LONG_PRESS_MS)
  }

  const handlePointerUp: PointerEventHandler<HTMLButtonElement> = () => {
    clearLongPress()
  }

  const handlePointerLeave: PointerEventHandler<HTMLButtonElement> = () => {
    clearLongPress()
  }

  function handleClick(): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onClick?.()
  }

  /**
   * Saves the current tag draft and leaves validation or mutation failures local to the edit dialog.
   */
  async function handleSave(): Promise<void> {
    const nextName = sanitizeTagName(draftName)
    if (!nextName) {
      setEditError('Tag name cannot be empty.')
      return
    }
    try {
      setEditError(null)
      await updateMutation.mutateAsync(nextName)
    } catch (reason) {
      setEditError(showError(reason, 'Unable to update tag'))
    }
  }

  /**
   * Deletes the current tag and leaves confirm-dialog failures local so the user can retry in place.
   */
  async function handleDeleteAction(): Promise<void> {
    setDeleteError(null)
    await deleteMutation.mutateAsync().catch((reason) => {
      const message = showError(reason, 'Unable to delete tag')
      setDeleteError(message)
      throw reason
    })
  }

  return {
    confirmDeleteOpen,
    deleteError,
    deleteMutation,
    draftName,
    editError,
    handleClick,
    handleDeleteAction,
    handlePointerDown,
    handlePointerLeave,
    handlePointerUp,
    handleSave,
    open,
    setConfirmDeleteOpen,
    setDeleteError,
    setDraftName,
    setEditError,
    setOpen,
    updateMutation,
  }
}
