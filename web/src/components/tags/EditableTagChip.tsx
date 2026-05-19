import { useRef, useState, type PointerEventHandler } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { sanitizeTagName } from '@/lib/sanitize'
import type { Tag } from '@/shared/types'
import { snippetQueryKeys } from '@/services/snippet-query'
import { deleteTag, updateTag } from '@/services/snippet-service'
import { showError, showSuccess } from '@/stores/feedback-store'
import { chipSelectedClass, chipUnselectedClass } from '@/styles/recipes'

interface EditableTagChipProps {
  interactive?: boolean
  onClick?: () => void
  selected?: boolean
  tag: Tag
}

const LONG_PRESS_MS = 500

export function EditableTagChip({
  interactive = true,
  onClick,
  selected = false,
  tag,
}: EditableTagChipProps): JSX.Element {
  const queryClient = useQueryClient()
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [draftName, setDraftName] = useState(tag.name)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Tag edits can affect both the library list and the saved tag list, so both query families need refreshing.
  const invalidateSnippetData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: snippetQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: snippetQueryKeys.tags }),
    ])
  }

  const updateMutation = useMutation({
    mutationFn: (name: string) => updateTag(tag.id, name),
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
    mutationFn: () => deleteTag(tag.id),
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

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerDown: PointerEventHandler<HTMLButtonElement> = () => {
    if (!interactive) return
    suppressClickRef.current = false
    clearLongPress()
    // Long press keeps single-tap available for selection while still exposing edit controls on touch devices.
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

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onClick?.()
  }

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

  async function handleDeleteAction(): Promise<void> {
    setDeleteError(null)
    await deleteMutation.mutateAsync().catch((reason) => {
      const message = showError(reason, 'Unable to delete tag')
      setDeleteError(message)
      throw reason
    })
  }

  return (
    <>
      <button
        className={selected ? chipSelectedClass : chipUnselectedClass}
        onClick={handleClick}
        onPointerCancel={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        type="button"
      >
        #{tag.name}
      </button>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditError(null)
            setDeleteError(null)
          }
          setOpen(nextOpen)
        }}
        open={open}
      >
        {!confirmDeleteOpen ? <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid gap-3">
            <Input
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Tag name"
              value={draftName}
            />
            <div className="flex items-center justify-end gap-2">
              <Button onClick={() => setOpen(false)} size="sm" variant="ghost">
                Cancel
              </Button>
              <Button
                className="whitespace-nowrap"
                disabled={updateMutation.isPending || !sanitizeTagName(draftName)}
                onClick={() => void handleSave()}
                size="sm"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                className="whitespace-nowrap"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeleteError(null)
                  setConfirmDeleteOpen(true)
                }}
                size="sm"
                variant="destructive"
              >
                Delete
              </Button>
            </div>
            {editError ? <Notice variant="error">{editError}</Notice> : null}
          </div>
        </DialogContent> : null}
      </Dialog>

      <ConfirmDialog
        confirmLabel="Delete"
        description="This will remove the tag from your library."
        errorMessage={deleteError}
        isPending={deleteMutation.isPending}
        onConfirm={handleDeleteAction}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteMutation.isPending) {
            setDeleteError(null)
          }
          setConfirmDeleteOpen(nextOpen)
        }}
        open={confirmDeleteOpen}
        pendingLabel="Deleting..."
        title="Delete tag?"
      >
        <div className="surface-preview px-3 py-2">
          <p className="text-sm font-medium text-[color:var(--foreground)]">#{tag.name}</p>
        </div>
      </ConfirmDialog>
    </>
  )
}
