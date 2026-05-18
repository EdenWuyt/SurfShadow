import type { JSX } from 'react'
import { Button } from '@/components/ui/button'

interface MarketingLandingProps {
  onSignIn: () => Promise<void>
}

function GoogleIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M21.8 12.23c0-.77-.07-1.5-.2-2.2H12v4.16h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.42 3.05-7.6Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.56c-.92.62-2.08.98-3.47.98-2.67 0-4.94-1.8-5.75-4.23H2.84v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.25 13.72A5.98 5.98 0 0 1 5.93 12c0-.6.11-1.18.32-1.72V7.64H2.84A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.36l3.21-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.05c1.5 0 2.84.52 3.9 1.54l2.92-2.92C17.07 3.05 14.76 2 12 2A10 10 0 0 0 2.84 7.64l3.41 2.64C7.06 7.85 9.33 6.05 12 6.05Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function MarketingLanding({ onSignIn }: MarketingLandingProps): JSX.Element {
  return (
    <section className="relative min-h-screen overflow-hidden px-5 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(196,91,60,0.18),transparent_20rem),linear-gradient(180deg,rgba(255,249,239,0.94),rgba(245,239,226,0.98))]" />
      <div className="absolute left-1/2 top-16 size-56 -translate-x-1/2 rounded-full border border-[color:var(--border)] opacity-70 animate-drift-slow" />
      <div className="absolute left-1/2 top-24 size-40 -translate-x-1/2 rounded-full border border-[color:var(--accent-soft)] animate-drift-slower" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="relative flex size-48 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(196,91,60,0.18),transparent_62%)] animate-float" />
            <div className="absolute inset-4 rounded-full border border-[color:var(--border)] animate-drift-slow" />
            <div className="absolute inset-10 rounded-full border border-[color:var(--accent-soft)] animate-drift-slower" />
            <div className="absolute inset-16 rounded-full bg-[linear-gradient(180deg,rgba(16,37,66,0.08),rgba(196,91,60,0.14))] shadow-[0_20px_50px_rgba(16,37,66,0.08)]" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="font-display text-5xl tracking-[-0.04em] text-[color:var(--foreground)] sm:text-6xl">
              SurfShadow
            </h1>
          </div>
        </div>

        <div className="pb-6">
          <Button
            className="group relative h-12 w-full justify-center gap-3 overflow-hidden rounded-full text-sm shadow-[0_12px_30px_rgba(16,37,66,0.08)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            onClick={() => void onSignIn()}
            variant="outline"
          >
            <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.72),transparent)] bg-[length:220%_100%] animate-shimmer opacity-60" />
            <span className="relative flex items-center gap-3">
              <span className="transition-transform duration-200 group-hover:scale-110">
                <GoogleIcon />
              </span>
              Continue with Google
            </span>
          </Button>
        </div>
      </div>
    </section>
  )
}
