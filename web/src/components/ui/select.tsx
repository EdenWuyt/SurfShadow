import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Select shares the same field chrome everywhere so pages only choose layout, not colors or rings.
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('field-select', className)} {...props} />
}
