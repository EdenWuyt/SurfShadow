import { Search } from 'lucide-react'
import type { JSX } from 'react'
import { Input } from '@/components/ui/input'

interface SearchFieldProps {
  onChange: (value: string) => void
  value: string
}

export function SearchField({ onChange, value }: SearchFieldProps): JSX.Element {
  return (
    <div className="relative p-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
      <Input
        className="h-12 rounded-full border-0 bg-[color:var(--surface-strong)] pl-11 pr-4 shadow-[0_10px_24px_rgba(16,37,66,0.08)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search"
        value={value}
      />
    </div>
  )
}
