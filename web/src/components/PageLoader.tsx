import type { JSX } from 'react'

export function PageLoader(): JSX.Element {
  return (
    <div className="grid min-h-[50vh] place-content-center justify-items-center gap-4" role="status" aria-live="polite">
      <div className="size-12 animate-spin rounded-full border-4 border-[rgba(196,91,60,0.16)] border-t-[color:var(--accent)]" />
      <p className="text-sm text-[color:var(--muted-foreground)]">Loading...</p>
    </div>
  )
}
