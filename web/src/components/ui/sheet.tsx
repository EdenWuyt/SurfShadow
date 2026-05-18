import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close

function SheetPortal(props: Dialog.DialogPortalProps) {
  return <Dialog.Portal {...props} />
}

function SheetOverlay({ className, ...props }: ComponentPropsWithoutRef<typeof Dialog.Overlay>) {
  return (
    <Dialog.Overlay
      className={cn(
        'fixed inset-0 z-40 bg-[rgba(16,37,66,0.28)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out',
        className,
      )}
      {...props}
    />
  )
}

export function SheetContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Content>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        className={cn(
          'fixed inset-y-4 left-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_28px_70px_rgba(16,37,66,0.18)] outline-none sm:left-6',
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-full p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)]">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Content>
    </SheetPortal>
  )
}

export function SheetHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />
}

export function SheetTitle({ className, ...props }: ComponentPropsWithoutRef<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn('font-serif text-2xl font-semibold text-[color:var(--foreground)]', className)}
      {...props}
    />
  )
}

export function SheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Description>) {
  return <Dialog.Description className={cn('text-sm text-[color:var(--muted-foreground)]', className)} {...props} />
}
