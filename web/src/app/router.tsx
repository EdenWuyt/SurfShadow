import { Suspense, lazy, type JSX } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import {
  loadEditSnippetPage,
  loadLibraryPage,
  loadLibrarySearchPage,
  loadNewSnippetPage,
  loadPracticePage,
} from '@/app/route-loaders'
import { AppShell } from '@/components/AppShell'
import { PageLoader } from '@/components/feedback/PageLoader'
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthProvider } from '@/features/auth/AuthProvider'

const LibraryPage = lazy(loadLibraryPage)
const LibrarySearchPage = lazy(loadLibrarySearchPage)
const NewSnippetPage = lazy(loadNewSnippetPage)
const EditSnippetPage = lazy(loadEditSnippetPage)
const PracticePage = lazy(loadPracticePage)

function Root(): JSX.Element {
  return (
    <AuthProvider>
      {/* AuthGate owns the pre-login landing split so route pages can assume an authenticated shell. */}
      <AuthGate>
        <AppShell>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </AppShell>
      </AuthGate>
    </AuthProvider>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: 'library/search', element: <LibrarySearchPage /> },
      { path: 'snippets/new', element: <NewSnippetPage /> },
      { path: 'snippets/:snippetId/edit', element: <EditSnippetPage /> },
      { path: 'practice/:snippetId', element: <PracticePage /> },
    ],
  },
])
