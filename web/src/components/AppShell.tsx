import { Plus } from 'lucide-react'
import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { GlobalErrorBanner } from '@/components/GlobalErrorBanner'
import { GlobalSuccessBanner } from '@/components/GlobalSuccessBanner'
import { Link, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/navigation/AppHeader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { useErrorStore } from '@/stores/error-store'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const location = useLocation()
  const { signOut } = useAuth()
  const clearError = useErrorStore((state) => state.clearError)
  const clearSuccess = useErrorStore((state) => state.clearSuccess)
  const errorMessage = useErrorStore((state) => state.message)
  const [showFab, setShowFab] = useState(true)
  const successMessage = useErrorStore((state) => state.successMessage)
  const isPracticeRoute = location.pathname.startsWith('/practice')
  const isCreateRoute = location.pathname === '/snippets/new'
  const isEditRoute = location.pathname.startsWith('/snippets/') && location.pathname.endsWith('/edit')
  const isSearchRoute = location.pathname === '/library/search'
  const isLibraryRoute = location.pathname === '/'

  let pageTitle = 'Snippet Library'
  if (isPracticeRoute) pageTitle = 'Practice Session'
  if (isCreateRoute) pageTitle = 'New Snippet'
  if (isEditRoute) pageTitle = 'Edit Snippet'
  if (isSearchRoute) pageTitle = 'Search'
  const shellPaddingBottomClass = isCreateRoute || isSearchRoute ? 'pb-0' : 'pb-6'

  useEffect(() => {
    setShowFab(true)

    if (isCreateRoute || isSearchRoute) return

    let lastY = window.scrollY
    const onScroll = () => {
      const nextY = window.scrollY
      const delta = nextY - lastY

      if (nextY <= 32) {
        setShowFab(true)
      } else if (delta > 6) {
        setShowFab(false)
      } else if (delta < -6) {
        setShowFab(true)
      }

      lastY = nextY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isCreateRoute, isSearchRoute, location.pathname])

  useEffect(() => {
    clearError()
    clearSuccess()
  }, [clearError, clearSuccess, location.pathname])

  useEffect(() => {
    if (!errorMessage) return

    const timeoutId = window.setTimeout(() => {
      clearError()
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [clearError, errorMessage])

  useEffect(() => {
    if (!successMessage) return

    const timeoutId = window.setTimeout(() => {
      clearSuccess()
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [clearSuccess, successMessage])

  return (
    <div
      className={`flex min-h-dvh flex-col bg-[color:var(--bg)] px-3 pt-0 text-[color:var(--foreground)] sm:px-4 md:px-6 ${shellPaddingBottomClass}`}
    >
      <AppHeader onSignOut={signOut} pageTitle={pageTitle} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col min-h-0">
        <GlobalSuccessBanner />
        <GlobalErrorBanner />
        {children}
      </main>
      {isLibraryRoute ? (
        <Button
          asChild
          className={`fixed bottom-3 right-3 z-30 h-12 w-12 shadow-[0_20px_38px_rgba(157,61,34,0.28)] transition-all duration-200 sm:bottom-4 sm:right-4 sm:h-14 sm:w-14 ${
            showFab ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
          }`}
          size="icon"
        >
          <Link aria-label="Create new snippet" to="/snippets/new">
            <Plus className="size-5" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
