import { QueryClient } from '@tanstack/react-query'

// Shared query defaults trade a short cache window for fewer noisy refetches while navigating the app shell.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,  // cache for 30 seconds
      refetchOnWindowFocus: false,  // don't refetch when window regains focus
    },
  },
})
