import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PageMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: 'default' | 'error'
}

export function PageMessage({ className, variant = 'default', ...props }: PageMessageProps) {
  return (
    <p
      className={cn(variant === 'error' ? 'page-status-error' : 'page-status', className)}
      {...props}
    />
  )
}
