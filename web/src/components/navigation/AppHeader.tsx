import { Menu, Search } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { searchRoutePrefetchProps } from '@/app/route-prefetch'
import { AppDrawer } from '@/components/navigation/AppDrawer'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/shared/branding'
import {
  Sheet,
  SheetTrigger,
} from '@/components/ui/sheet'

interface AppHeaderProps {
  pageTitle: string
  onSignOut: () => Promise<void>
}

export function AppHeader({ pageTitle, onSignOut }: AppHeaderProps): JSX.Element {
  return (
    <header className="-mx-3 sticky top-0 z-30 mb-3 w-auto pointer-events-none sm:-mx-4 sm:mb-4 md:mx-auto md:mb-6 md:w-full md:max-w-7xl">
      <div className="surface-header pointer-events-auto grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-4 md:py-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" size="icon" variant="secondary">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <AppDrawer onSignOut={onSignOut} />
        </Sheet>

        <div className="min-w-0">
          <p className="font-display text-[10px] tracking-[0.08em] text-[color:var(--accent-strong)] sm:text-xs">
            {APP_NAME}
          </p>
          <h1 className="truncate font-serif text-lg text-[color:var(--foreground)] sm:text-xl md:text-2xl">
            {pageTitle}
          </h1>
        </div>

        <Button asChild className="justify-self-end" size="icon" variant="ghost">
          <Link aria-label="Open search and filters" to="/library/search" {...searchRoutePrefetchProps}>
            <Search className="size-5" />
          </Link>
        </Button>
      </div>
    </header>
  )
}
