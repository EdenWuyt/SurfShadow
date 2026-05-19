import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const noticeVariants = cva('surface-banner', {
  variants: {
    variant: {
      default: 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]',
      error: 'surface-banner-error',
      success: 'surface-banner-success',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface NoticeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof noticeVariants> {}

// Notice is the shared status surface for inline messages, dialogs, and global banners.
export function Notice({ className, variant, ...props }: NoticeProps) {
  return <div className={cn(noticeVariants({ variant }), className)} {...props} />
}
