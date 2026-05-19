import type { JSX } from 'react'

export function PageLoader(): JSX.Element {
  return (
    <div className="grid min-h-[50vh] place-content-center justify-items-center gap-4" aria-live="polite" role="status">
      <div className="size-12 animate-spin rounded-full border-4 border-[color:var(--accent-soft)] border-t-[color:var(--accent)]" />
      <p className="page-status">Loading...</p>
    </div>
  )
}
