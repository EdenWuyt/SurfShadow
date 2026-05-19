import { ChevronDown } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

interface ExpandableFilterSectionProps {
  children: ReactNode
  empty?: ReactNode
  title: string
}

export function ExpandableFilterSection({
  children,
  empty,
  title,
}: ExpandableFilterSectionProps): JSX.Element {
  return (
    <details className="group" open>
      <summary className="flex list-none items-center justify-between gap-3 py-1 text-sm font-medium text-[color:var(--foreground)]">
        <span>{title}</span>
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-3">
        {empty ?? children}
      </div>
    </details>
  )
}
