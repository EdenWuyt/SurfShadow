import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  getLibraryFiltersFromSearchParams,
  getPageFromSearchParams,
  updateLibrarySearchParams,
} from '@/features/library/lib/library-search'
import { sanitizeSnippetSortOrder } from '@/lib/sanitize'
import { getVoiceForTone } from '@/shared/languages'
import type { PlaybackMode, Snippet, SnippetPage } from '@/shared/types'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { listSnippetsPage, removeSnippetRecord } from '@/features/snippets/repositories/snippet-repository'
import { requestTtsAudio } from '@/features/audio/api/tts-api'
import { showError, showSuccess } from '@/stores/feedback-store'

const PAGE_SIZE = 8

interface ActivePlayback {
  snippetId: string
  mode: PlaybackMode
}

interface UseLibraryPageResult {
  activePlayback: ActivePlayback | null
  deleteError: string | null
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
  const [deleteError, setDeleteError] = useState<string | null>(null)
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
      setDeleteError(showError(reason, 'Failed to delete snippet'))
    },
  })

  useEffect(
    () => () => {
      playbackTokenRef.current += 1
      speechSynthesis.cancel()
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
    speechSynthesis.cancel()
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
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(snippetId)
    } catch (reason) {
      throw new Error(showError(reason, 'Failed to delete snippet'))
    }
  }

  /**
   * Plays either browser speech synthesis or server TTS while guarding stale async completions with one token owner.
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
      if (mode === 'system') {
        const utterance = new SpeechSynthesisUtterance(snippet.text)
        utterance.lang = snippet.language
        utterance.rate = 1
        utterance.onend = () => {
          if (playbackTokenRef.current === token) setActivePlayback(null)
        }
        utterance.onerror = () => {
          if (playbackTokenRef.current === token) setActivePlayback(null)
        }
        speechSynthesis.speak(utterance)
        return
      }

      const audio = await requestTtsAudio({
        text: snippet.text,
        language: snippet.language,
        voice: getVoiceForTone(snippet.language, mode === 'neutral' ? 'neutral' : 'casual'),
        speed: 1,
      })

      if (playbackTokenRef.current !== token) return

      const blob = new Blob([Uint8Array.from(audio).buffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const player = new Audio(url)
      audioRef.current = player
      await player.play()
      player.onerror = () => {
        if (audioRef.current === player) audioRef.current = null
        if (playbackTokenRef.current === token) {
          setActivePlayback(null)
          setDeleteError(showError(new Error('Unable to play snippet audio'), 'Unable to play snippet audio'))
        }
      }
      player.onended = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === player) audioRef.current = null
        if (playbackTokenRef.current === token) setActivePlayback(null)
      }
    } catch (reason) {
      setDeleteError(showError(reason, 'Unable to play snippet audio'))
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
    deleteError,
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
