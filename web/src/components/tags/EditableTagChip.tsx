import { useRef, useState, type PointerEventHandler } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { sanitizeTagName } from '@/lib/sanitize'
import type { Tag } from '@/shared/types'
import { snippetQueryKeys } from '@/services/snippet-query'
import { deleteTag, updateTag } from '@/services/snippet-service'
import { reportError, reportSuccess } from '@/stores/error-store'

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
  const [status, setStatus] = useState<string | null>(null)

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
      setStatus(reportSuccess('Tag updated.'))
      setOpen(false)
    },
    onError: (reason: unknown) => {
      setStatus(reason instanceof Error ? reason.message : 'Unable to update tag')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTag(tag.id),
    onSuccess: async () => {
      await invalidateSnippetData()
      setStatus(reportSuccess('Tag deleted.'))
      setOpen(false)
    },
    onError: (reason: unknown) => {
      setStatus(reason instanceof Error ? reason.message : 'Unable to delete tag')
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
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      setDraftName(tag.name)
      setStatus(null)
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
      setStatus('Tag name cannot be empty.')
      return
    }
    setStatus('Saving tag...')
    try {
      await updateMutation.mutateAsync(nextName)
    } catch (reason) {
      setStatus(reportError(reason, 'Unable to update tag'))
    }
  }

  async function handleDeleteAction(): Promise<void> {
    setStatus('Deleting tag...')
    try {
      await deleteMutation.mutateAsync()
    } catch (reason) {
      setStatus(reportError(reason, 'Unable to delete tag'))
    }
  }

  return (
    <>
      <button
        className={
          selected
            ? 'inline-flex items-center rounded-full bg-[color:var(--accent)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--accent-foreground)] sm:px-3 sm:text-xs'
            : 'inline-flex items-center rounded-full bg-[color:var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)] sm:px-3 sm:text-xs'
        }
        onClick={handleClick}
        onPointerCancel={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        type="button"
      >
        #{tag.name}
      </button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
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
                Save
              </Button>
              <Button
                className="whitespace-nowrap"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmDeleteOpen(true)}
                size="sm"
                variant="destructive"
              >
                Delete
              </Button>
            </div>
            {status ? <p className="text-sm text-[color:var(--muted-foreground)]">{status}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setConfirmDeleteOpen} open={confirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tag?</DialogTitle>
            <DialogDescription>
              This will remove the tag from your library.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button onClick={() => setConfirmDeleteOpen(false)} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              className="whitespace-nowrap"
              disabled={deleteMutation.isPending}
              onClick={() => {
                void handleDeleteAction()
                setConfirmDeleteOpen(false)
              }}
              size="sm"
              variant="destructive"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
