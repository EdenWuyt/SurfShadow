import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'

interface ConfirmDialogProps {
  cancelLabel?: string
  children?: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  confirmVariant?: 'default' | 'destructive'
  description?: string
  errorMessage?: string | null
  isPending?: boolean
  onConfirm: () => Promise<void> | void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

// ConfirmDialog keeps destructive flows consistent and only closes after a successful async confirm.
export function ConfirmDialog({
  cancelLabel = 'Cancel',
  children,
  confirmLabel = 'Confirm',
  pendingLabel,
  confirmVariant = 'destructive',
  description,
  errorMessage,
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  const resolvedPendingLabel = pendingLabel ?? `${confirmLabel}...`

  return (
    <Dialog onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)} open={open}>
      <DialogContent>
        <DialogHeader className='mb-3'>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {errorMessage ? <Notice variant="error" className='mt-3'>{errorMessage}</Notice> : null}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button disabled={isPending} onClick={() => onOpenChange(false)} size="lg" variant="ghost">
            {cancelLabel}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              void onConfirm()
            }}
            size="sm"
            variant={confirmVariant}
          >
            {isPending ? resolvedPendingLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
