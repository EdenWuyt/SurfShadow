import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

interface AppBannerProps {
  icon: LucideIcon
  message: string | null
  onDismiss: () => void
  variant: 'error' | 'success'
}

// AppBanner owns the shared banner layout so success and error states only differ by data and icon.
export function AppBanner({
  icon: Icon,
  message,
  onDismiss,
  variant,
}: AppBannerProps): JSX.Element | null {
  if (!message) return null

  return (
    <Notice className="mb-3" variant={variant}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0" />
          <p>{message}</p>
        </div>
        <Button
          className="h-4.5 w-4.5 shrink-0 self-start rounded-full p-0"
          onClick={onDismiss}
          variant="ghost"
        >
          <X className="mt-0.5 size-4" />
        </Button>
      </div>
    </Notice>
  )
}
