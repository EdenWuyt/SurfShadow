import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-40 w-full rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--foreground)] shadow-sm transition-colors placeholder:text-[color:var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]',
        className,
      )}
      {...props}
    />
  )
}
