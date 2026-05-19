import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import type { Tag } from '@/shared/types'
import { chipSelectedClass, chipUnselectedClass } from '@/styles/recipes'
import { useEditableTagChip } from '@/features/tags/hooks/use-editable-tag-chip'

interface EditableTagChipProps {
  interactive?: boolean
  onClick?: () => void
  selected?: boolean
  tag: Tag
}

export function EditableTagChip({
  interactive = true,
  onClick,
  selected = false,
  tag,
}: EditableTagChipProps): JSX.Element {
  const {
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
  } = useEditableTagChip({ interactive, onClick, tag })

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
        {!confirmDeleteOpen ? (
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
                  disabled={updateMutation.isPending || !draftName.trim()}
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
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDialog
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
        title="Delete tag?"
      >
        <div className="surface-preview px-3 py-2">
          <p className="text-sm font-medium text-[color:var(--foreground)]">#{tag.name}</p>
        </div>
      </ConfirmDialog>
    </>
  )
}
