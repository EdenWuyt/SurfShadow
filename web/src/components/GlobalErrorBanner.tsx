import { AlertCircle, X } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { useErrorStore } from '@/stores/error-store'

export function GlobalErrorBanner(): JSX.Element | null {
  const message = useErrorStore((state) => state.message)
  const clearError = useErrorStore((state) => state.clearError)

  if (!message) return null

  return (
    <div className="mb-3 rounded-[20px] border border-[color:var(--danger)] bg-[rgba(162,41,32,0.08)] px-4 py-3 text-sm text-[color:var(--danger-strong)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{message}</p>
        </div>
        <Button className="h-7 w-7 shrink-0" onClick={clearError} size="icon" variant="ghost">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
