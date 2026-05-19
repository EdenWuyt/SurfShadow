import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { newSnippetRoutePrefetchProps } from '@/app/route-prefetch'
import { AppBanner } from '@/components/feedback/AppBanner'
import { Link, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/navigation/AppHeader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFeedbackStore } from '@/stores/feedback-store'
import { appContentClass, appShellClass, floatingActionButtonClass } from '@/styles/recipes'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const location = useLocation()
  const { signOut } = useAuth()
  const clearError = useFeedbackStore((state) => state.clearErrorMessage)
  const clearSuccess = useFeedbackStore((state) => state.clearSuccessMessage)
  const errorMessage = useFeedbackStore((state) => state.errorMessage)
  const [showFab, setShowFab] = useState(true)
  const successMessage = useFeedbackStore((state) => state.successMessage)
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

  // Route changes reset transient banners so status from one flow does not leak into the next screen.
  useEffect(() => {
    clearError()
    clearSuccess()
  }, [clearError, clearSuccess, location.pathname])

  // Error and success banners auto-dismiss unless the user moves to another route first.
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
    <div className={`${appShellClass} ${shellPaddingBottomClass}`}>
      <AppHeader onSignOut={signOut} pageTitle={pageTitle} />
      <main className={appContentClass}>
        <AppBanner icon={CheckCircle2} message={successMessage} onDismiss={clearSuccess} variant="success" />
        <AppBanner icon={AlertCircle} message={errorMessage} onDismiss={clearError} variant="error" />
        {children}
      </main>
      {isLibraryRoute ? (
        <Button
          asChild
          className={`${floatingActionButtonClass} ${
            showFab ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
          }`}
          size="icon"
        >
          <Link aria-label="Create new snippet" to="/snippets/new" {...newSnippetRoutePrefetchProps}>
            <Plus className="size-5" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
