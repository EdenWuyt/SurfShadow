import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  getLibraryFiltersFromSearchParams,
  getPageFromSearchParams,
  updateLibrarySearchParams,
} from '@/features/library/lib/library-search'
import { sanitizeSnippetSortOrder } from '@/lib/sanitize'
import type { PlaybackMode, Snippet, SnippetPage } from '@/shared/types'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { listSnippetsPage, removeSnippetRecord } from '@/features/snippets/repositories/snippet-repository'
import { playSourceSnippet } from '@/features/audio/lib/source-playback'
import { cancelSystemSpeech } from '@/features/audio/lib/system-speech'
import { showError, showSuccess } from '@/stores/feedback-store'

const PAGE_SIZE = 8

interface ActivePlayback {
  snippetId: string
  mode: PlaybackMode
}

interface UseLibraryPageResult {
  activePlayback: ActivePlayback | null
  actionError: string | null
  deleting: boolean
  onDelete: (snippetId: string) => Promise<void>
  onOrderChange: (nextOrder: string) => void
  onPageChange: (page: number) => void
  onPlay: (snippet: Snippet, mode: PlaybackMode) => Promise<void>
  order: string
  queryError: unknown
  snippets: Snippet[]
  snippetsPage: SnippetPage | undefined
  totalCount: number
  totalPages: number
  loading: boolean
}

/**
 * Owns the library page query state, URL-backed pagination, snippet deletion, and snippet playback lifecycle.
 */
export function useLibraryPage(): UseLibraryPageResult {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackTokenRef = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const [actionError, setActionError] = useState<string | null>(null)
  const [activePlayback, setActivePlayback] = useState<ActivePlayback | null>(null)
  const urlFilters = getLibraryFiltersFromSearchParams(searchParams)
  const deferredSearch = useDeferredValue(urlFilters.search ?? '')
  const page = getPageFromSearchParams(searchParams)

  const filters = {
    search: deferredSearch,
    languages: urlFilters.languages,
    tagIds: urlFilters.tagIds,
    order: urlFilters.order,
  }

  const snippetsQuery = useQuery({
    queryKey: snippetQueryKeys.list(filters, page, PAGE_SIZE),
    queryFn: () => listSnippetsPage(filters, page, PAGE_SIZE),
  })

  const deleteMutation = useMutation({
    mutationFn: removeSnippetRecord,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: snippetQueryKeys.all })
      showSuccess('Snippet deleted.')
    },
    onError: (reason: unknown) => {
      setActionError(showError(reason, 'Failed to delete snippet'))
    },
  })

  useEffect(
    () => () => {
      playbackTokenRef.current += 1
      void cancelSystemSpeech()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    },
    [],
  )

  /**
   * Stops any current snippet playback and invalidates older async playback callbacks.
   */
  function stopPlayback(): void {
    playbackTokenRef.current += 1
    void cancelSystemSpeech()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setActivePlayback(null)
  }

  /**
   * Deletes one snippet and keeps the inline library error near the card grid when the mutation fails.
   */
  async function onDelete(snippetId: string): Promise<void> {
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(snippetId)
    } catch (reason) {
      throw new Error(showError(reason, 'Failed to delete snippet'))
    }
  }

  /**
   * The library owns only one source-playback channel at a time.
   * The token protects against late system-speech or TTS completions after the user has already stopped or switched snippets.
   */
  async function onPlay(snippet: Snippet, mode: PlaybackMode): Promise<void> {
    if (activePlayback?.snippetId === snippet.id && activePlayback.mode === mode) {
      stopPlayback()
      return
    }

    stopPlayback()
    const token = playbackTokenRef.current + 1
    playbackTokenRef.current = token
    setActivePlayback({ snippetId: snippet.id, mode })
    try {
      /**
       * The library page keeps one shared inline error surface, so playback capability failures land beside delete failures.
       */
      await playSourceSnippet({
        audioRef,
        isTokenCurrent: () => playbackTokenRef.current === token,
        mode,
        onStop: () => setActivePlayback(null),
        onSystemUnavailable: () => {
          setActionError(showError(new Error('System speech is unavailable on this device'), 'System speech is unavailable on this device'))
        },
        snippet,
      })
    } catch (reason) {
      setActionError(showError(reason, 'Unable to play snippet audio'))
      setActivePlayback(null)
    } finally {
      if (playbackTokenRef.current !== token) {
        setActivePlayback(null)
      }
    }
  }

  /**
   * Commits the selected page back into the URL so pagination stays shareable and refresh-safe.
   */
  function onPageChange(nextPage: number): void {
    setSearchParams(updateLibrarySearchParams(searchParams, { ...urlFilters, page: nextPage }))
  }

  /**
   * Commits sort-order changes to the URL and resets pagination to page one.
   */
  function onOrderChange(nextOrder: string): void {
    setSearchParams(
      updateLibrarySearchParams(searchParams, {
        ...urlFilters,
        order: sanitizeSnippetSortOrder(nextOrder),
        page: 1,
      }),
    )
  }

  return {
    activePlayback,
    actionError,
    deleting: deleteMutation.isPending,
    loading: snippetsQuery.isLoading,
    onDelete,
    onOrderChange,
    onPageChange,
    onPlay,
    order: urlFilters.order ?? 'newest',
    queryError: snippetsQuery.error,
    snippets: snippetsQuery.data?.items ?? [],
    snippetsPage: snippetsQuery.data,
    totalCount: snippetsQuery.data?.totalCount ?? 0,
    totalPages: snippetsQuery.data?.totalPages ?? 0,
  }
}
