import { ChevronDown } from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { filterSectionBodyClass, filterSectionSummaryClass } from '@/styles/recipes'

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
      <summary className={filterSectionSummaryClass}>
        <span>{title}</span>
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className={filterSectionBodyClass}>
        {empty ?? children}
      </div>
    </details>
  )
}
