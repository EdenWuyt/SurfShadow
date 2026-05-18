import { CheckCircle2, X } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { useErrorStore } from '@/stores/error-store'

export function GlobalSuccessBanner(): JSX.Element | null {
  const message = useErrorStore((state) => state.successMessage)
  const clearSuccess = useErrorStore((state) => state.clearSuccess)

  if (!message) return null

  return (
    <div className="mb-3 rounded-[20px] border border-[rgba(28,111,66,0.35)] bg-[rgba(28,111,66,0.12)] px-4 py-3 text-sm text-[rgb(28,111,66)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{message}</p>
        </div>
        <Button className="h-7 w-7 shrink-0" onClick={clearSuccess} size="icon" variant="ghost">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
