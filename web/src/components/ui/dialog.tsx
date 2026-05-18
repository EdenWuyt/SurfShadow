import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

function DialogPortal(props: DialogPrimitive.DialogPortalProps) {
  return <DialogPrimitive.Portal {...props} />
}

function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn('fixed inset-0 z-40 bg-[rgba(16,37,66,0.32)] backdrop-blur-sm', className)}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[0_24px_60px_rgba(16,37,66,0.18)] outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)]">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-2 pr-8', className)} {...props} />
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('font-serif text-2xl font-semibold text-[color:var(--foreground)]', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-[color:var(--muted-foreground)]', className)}
      {...props}
    />
  )
}
