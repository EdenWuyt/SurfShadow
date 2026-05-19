import { useDeferredValue, useEffect, useRef, useState, type JSX } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SnippetLibraryCard } from '@/components/library/SnippetLibraryCard'
import { SnippetPagination } from '@/components/library/SnippetPagination'
import { Card, CardContent } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { PageMessage } from '@/components/ui/page-message'
import { Select } from '@/components/ui/select'
import { useSearchParams } from 'react-router-dom'
import {
  getLibraryFiltersFromSearchParams,
  getOrderOptions,
  getPageFromSearchParams,
  updateLibrarySearchParams,
} from '@/lib/library-search'
import { sanitizeSnippetSortOrder } from '@/lib/sanitize'
import { getVoiceForTone } from '@/shared/languages'
import type { PlaybackMode, Snippet } from '@/shared/types'
import { snippetQueryKeys } from '@/services/snippet-query'
import { deleteSnippet, listSnippets } from '@/services/snippet-service'
import { requestTtsAudio } from '@/services/tts-service'
import { showError, showSuccess } from '@/stores/feedback-store'
import { compactSelectClass, pageMetaClass } from '@/styles/recipes'

const PAGE_SIZE = 8

interface ActivePlayback {
  snippetId: string
  mode: PlaybackMode
}

export default function LibraryPage(): JSX.Element {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackTokenRef = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
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
    queryFn: () => listSnippets(filters, page, PAGE_SIZE),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSnippet,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: snippetQueryKeys.all }),
      ])
      showSuccess('Snippet deleted.')
    },
    onError: (reason: unknown) => {
      setError(showError(reason, 'Failed to delete snippet'))
    },
  })

  async function handleDelete(snippetId: string): Promise<void> {
    setError(null)
    try {
      await deleteMutation.mutateAsync(snippetId)
    } catch (reason) {
      throw new Error(showError(reason, 'Failed to delete snippet'))
    }
  }

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

  // The playback flow needs one owner token so a new request can safely cancel a stale TTS or speech callback.
  async function handlePlay(snippet: Snippet, mode: PlaybackMode): Promise<void> {
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
      player.play()
      player.onerror = () => {
        if (audioRef.current === player) audioRef.current = null
        if (playbackTokenRef.current === token) {
          setActivePlayback(null)
          setError(showError(new Error('Unable to play snippet audio'), 'Unable to play snippet audio'))
        }
      }
      player.onended = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === player) audioRef.current = null
        if (playbackTokenRef.current === token) setActivePlayback(null)
      }
    } catch (reason) {
      setError(showError(reason, 'Unable to play snippet audio'))
      setActivePlayback(null)
    } finally {
      if (playbackTokenRef.current !== token) {
        setActivePlayback(null)
      }
    }
  }

  function setPageInUrl(nextPage: number): void {
    setSearchParams(updateLibrarySearchParams(searchParams, { ...urlFilters, page: nextPage }))
  }

  function setOrderInUrl(nextOrder: string): void {
    setSearchParams(
      updateLibrarySearchParams(searchParams, {
        ...urlFilters,
        order: sanitizeSnippetSortOrder(nextOrder),
        page: 1,
      }),
    )
  }

  const snippetsPage = snippetsQuery.data
  const snippets = snippetsPage?.items ?? []
  const loading = snippetsQuery.isLoading
  const queryError = snippetsQuery.error
  const totalPages = snippetsPage?.totalPages ?? 0
  const totalCount = snippetsPage?.totalCount ?? 0

  return (
    <section className="grid gap-4">
      {loading ? <PageMessage>Loading snippets...</PageMessage> : null}
      {queryError ? (
        <PageMessage variant="error">
          {queryError instanceof Error ? queryError.message : 'Failed to load snippets'}
        </PageMessage>
      ) : null}
      {error ? <Notice variant="error">{error}</Notice> : null}

      <div className="flex items-center justify-between gap-3">
        <p className={pageMetaClass}>
          {totalCount} snippets in total
        </p>
        <label className={`flex items-center gap-2 ${pageMetaClass}`}>
          <span>Order</span>
          <Select
            className={compactSelectClass}
            onChange={(event) => setOrderInUrl(event.target.value)}
            value={urlFilters.order ?? 'newest'}
          >
            {getOrderOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snippets.map((snippet) => (
          <SnippetLibraryCard
            activePlayback={activePlayback}
            deleting={deleteMutation.isPending}
            key={snippet.id}
            onDelete={handleDelete}
            onPlay={handlePlay}
            snippet={snippet}
          />
        ))}
      </div>

      {!loading && !snippets.length ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="font-serif text-2xl text-[color:var(--foreground)]">No snippets yet</h3>
            <PageMessage>
              Start with a new snippet or import text from an image to build your practice library.
            </PageMessage>
          </CardContent>
        </Card>
      ) : null}

      {totalPages > 1 ? <SnippetPagination onPageChange={setPageInUrl} page={snippetsPage!} /> : null}
    </section>
  )
}
