import { Menu, Search } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { AppDrawer } from '@/components/navigation/AppDrawer'
import { Button } from '@/components/ui/button'
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
      <div className="pointer-events-auto grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 shadow-[0_12px_30px_rgba(16,37,66,0.08)] sm:px-4 sm:py-2.5 md:rounded-[28px] md:border md:px-4 md:py-3">
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
            SurfShadow
          </p>
          <h1 className="truncate font-serif text-lg text-[color:var(--foreground)] sm:text-xl md:text-2xl">
            {pageTitle}
          </h1>
        </div>

        <div className="px-2">
          <Link to="/library/search">
            <Search className="size-6" />
          </Link>
        </div>
      </div>
    </header>
  )
}
