import { Suspense, lazy, type JSX } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageLoader } from '@/components/PageLoader'
import { AuthGate } from '@/features/auth/AuthGate'
import { AuthProvider } from '@/features/auth/AuthProvider'

const LibraryPage = lazy(() => import('@/pages/LibraryPage'))
const LibrarySearchPage = lazy(() => import('@/pages/LibrarySearchPage'))
const NewSnippetPage = lazy(() => import('@/pages/NewSnippetPage'))
const EditSnippetPage = lazy(() => import('@/pages/EditSnippetPage'))
const PracticePage = lazy(() => import('@/pages/PracticePage'))

function Root(): JSX.Element {
  return (
    <AuthProvider>
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
