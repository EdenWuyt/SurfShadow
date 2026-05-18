import { LogOut, Plus, Rows3, Search } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface AppDrawerProps {
  onSignOut: () => Promise<void>
}

const drawerLinkClassName =
  'flex items-center gap-3 rounded-2xl bg-[color:var(--surface-2)] px-4 py-4 text-sm font-medium'

export function AppDrawer({ onSignOut }: AppDrawerProps): JSX.Element {
  return (
    <SheetContent>
      <SheetHeader className="pr-8">
        <SheetTitle>Menu</SheetTitle>
      </SheetHeader>
      <nav className="mt-8 grid gap-3">
        <SheetClose asChild>
          <Link className={drawerLinkClassName} to="/">
            <Rows3 className="size-4" />
            Snippets Library
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link className={drawerLinkClassName} to="/snippets/new">
            <Plus className="size-4" />
            Add new snippet
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link className={drawerLinkClassName} to="/library/search">
            <Search className="size-4" />
            Search and filter
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Button className={cn(drawerLinkClassName, "justify-start py-6")} onClick={() => void onSignOut()} variant="secondary">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </SheetClose>
      </nav>
    </SheetContent>
  )
}
