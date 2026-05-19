import {
  loadEditSnippetPage,
  loadLibrarySearchPage,
  loadNewSnippetPage,
  loadPracticePage,
} from '@/app/route-loaders'

type PrefetchHandlerProps = {
  onFocus: () => void
  onMouseEnter: () => void
  onTouchStart: () => void
}

function createRoutePrefetchHandlers(loadRoute: () => Promise<unknown>): PrefetchHandlerProps {
  let preloaded = false

  // Prefetch is intentionally one-shot so repeated hover/focus interactions do not keep spawning imports.
  const preload = () => {
    if (preloaded) return
    preloaded = true
    void loadRoute()
  }

  return {
    onFocus: preload,
    onMouseEnter: preload,
    onTouchStart: preload,
  }
}

export const searchRoutePrefetchProps = createRoutePrefetchHandlers(loadLibrarySearchPage)
export const newSnippetRoutePrefetchProps = createRoutePrefetchHandlers(loadNewSnippetPage)
export const practiceRoutePrefetchProps = createRoutePrefetchHandlers(loadPracticePage)
export const editSnippetRoutePrefetchProps = createRoutePrefetchHandlers(loadEditSnippetPage)
