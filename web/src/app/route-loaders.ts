// Route loaders live outside router.tsx so prefetch helpers can import them without creating a router cycle.
export const loadLibraryPage = () => import('@/pages/LibraryPage')
export const loadLibrarySearchPage = () => import('@/pages/LibrarySearchPage')
export const loadNewSnippetPage = () => import('@/pages/NewSnippetPage')
export const loadEditSnippetPage = () => import('@/pages/EditSnippetPage')
export const loadPracticePage = () => import('@/pages/PracticePage')
