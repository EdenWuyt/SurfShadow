import { useEffect, useRef, useState, type JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { AttemptPanel } from '@/components/practice/AttemptPanel'
import { PracticeSnippetCard } from '@/components/practice/PracticeSnippetCard'
import { SavedAttemptsPanel } from '@/components/practice/SavedAttemptsPanel'
import { SourcePlaybackPanel } from '@/components/practice/SourcePlaybackPanel'
import { PageMessage } from '@/components/ui/page-message'
import { useAuth } from '@/features/auth/AuthProvider'
import { getVoiceForTone } from '@/shared/languages'
import type { PlaybackMode, PracticeRecording } from '@/shared/types'
import { snippetQueryKeys } from '@/services/snippet-query'
import { getSnippet } from '@/services/snippet-service'
import {
  deletePracticeRecording,
  getPracticeRecordingUrl,
  listPracticeRecordings,
  savePracticeRecording,
} from '@/services/practice-recording-service'
import { requestTtsAudio } from '@/services/tts-service'
import { showError, showSuccess } from '@/stores/feedback-store'

function playBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  return new Promise((resolve) => {
    audio.play()
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
  })
}

function playBytes(bytes: Uint8Array): Promise<void> {
  const normalizedBytes = Uint8Array.from(bytes)
  return playBlob(new Blob([normalizedBytes.buffer], { type: 'audio/mpeg' }))
}

export default function PracticePage(): JSX.Element {
  const { snippetId = '' } = useParams()
  const { user } = useAuth()
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const draftAudioRef = useRef<HTMLAudioElement | null>(null)
  const savedAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackTokenRef = useRef(0)
  const [recordings, setRecordings] = useState<PracticeRecording[]>([])
  const [draftRecording, setDraftRecording] = useState<Blob | null>(null)
  const [activeSavedRecordingId, setActiveSavedRecordingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingRecordingId, setDeletingRecordingId] = useState<string | null>(null)
  const [isDraftPlaying, setIsDraftPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('neutral')
  const [isSourcePlaying, setIsSourcePlaying] = useState(false)
  const [micAllowed, setMicAllowed] = useState(true)
  const [loadingRecordings, setLoadingRecordings] = useState(true)

  const snippetQuery = useQuery({
    queryKey: snippetQueryKeys.detail(snippetId),
    queryFn: () => getSnippet(snippetId),
  })

  useEffect(() => {
    let mounted = true
    setLoadingRecordings(true)

    // Saved attempts are loaded outside the main snippet query because they come from Storage-backed practice data.
    void listPracticeRecordings(snippetId)
      .then((nextRecordings) => {
        if (!mounted) return
        setRecordings(nextRecordings)
      })
      .catch((reason: unknown) => {
        if (!mounted) return
        showError(reason, 'Failed to load practice session')
      })
      .finally(() => {
        if (!mounted) return
        setLoadingRecordings(false)
      })

    return () => {
      mounted = false
      playbackTokenRef.current += 1
      speechSynthesis.cancel()
      audioRef.current?.pause()
      draftAudioRef.current?.pause()
      savedAudioRef.current?.pause()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [snippetId])

  const snippet = snippetQuery.data ?? null

  function stopSourcePlayback(): void {
    playbackTokenRef.current += 1
    speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsSourcePlaying(false)
  }

  function stopDraftPlayback(): void {
    if (draftAudioRef.current) {
      draftAudioRef.current.pause()
      draftAudioRef.current.currentTime = 0
      draftAudioRef.current = null
    }
    setIsDraftPlaying(false)
  }

  function stopSavedPlayback(): void {
    if (savedAudioRef.current) {
      savedAudioRef.current.pause()
      savedAudioRef.current.currentTime = 0
      savedAudioRef.current = null
    }
    setActiveSavedRecordingId(null)
  }

  // Source playback can switch between browser speech and server TTS, so the token guards stale callbacks.
  async function handlePlaySource(): Promise<void> {
    if (!snippet) return
    if (isSourcePlaying) {
      stopSourcePlayback()
      return
    }

    stopDraftPlayback()
    stopSavedPlayback()
    const token = playbackTokenRef.current + 1
    playbackTokenRef.current = token
    setIsSourcePlaying(true)

    try {
      if (playbackMode === 'system') {
        const utterance = new SpeechSynthesisUtterance(snippet.text)
        utterance.lang = snippet.language
        utterance.rate = 1
        utterance.onend = () => {
          if (playbackTokenRef.current === token) {
            setIsSourcePlaying(false)
          }
        }
        utterance.onerror = () => {
          if (playbackTokenRef.current === token) {
            setIsSourcePlaying(false)
            showError(new Error('Unable to play source audio'), 'Unable to play source audio')
          }
        }
        speechSynthesis.speak(utterance)
        return
      }

      const audio = await requestTtsAudio({
        text: snippet.text,
        language: snippet.language,
        voice: getVoiceForTone(snippet.language, playbackMode === 'neutral' ? 'neutral' : 'casual'),
        speed: 1,
      })

      if (playbackTokenRef.current !== token) return

      const blob = new Blob([Uint8Array.from(audio).buffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const player = new Audio(url)
      audioRef.current = player
      await player.play()
      player.onended = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === player) audioRef.current = null
        if (playbackTokenRef.current === token) {
          setIsSourcePlaying(false)
        }
      }
    } catch (reason) {
      setIsSourcePlaying(false)
      showError(reason, 'Unable to play source audio')
    }
  }

  async function startRecording(): Promise<void> {
    try {
      // Draft recordings stay local until the user explicitly saves them as a practice attempt.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicAllowed(true)
      streamRef.current = stream
      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        setDraftRecording(blob)
        stopDraftPlayback()
        setIsRecording(false)
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      recorder.start()
      setDraftRecording(null)
      setIsRecording(true)
    } catch (reason) {
      setMicAllowed(false)
      showError(reason, 'Microphone permission is blocked. You can still listen and review saved attempts.')
    }
  }

  function stopRecording(): void {
    recorderRef.current?.stop()
  }

  async function handleSaveDraft(): Promise<void> {
    if (!draftRecording || !user || !snippet) return

    try {
      const saved = await savePracticeRecording(user.id, snippet.id, draftRecording)
      setRecordings((current) => [saved, ...current])
      setDraftRecording(null)
      showSuccess('Practice attempt saved.')
    } catch (reason) {
      showError(reason, 'Unable to save recording')
    }
  }

  async function handlePlayDraft(): Promise<void> {
    if (!draftRecording) return
    if (isDraftPlaying) {
      stopDraftPlayback()
      return
    }
    stopSourcePlayback()
    stopSavedPlayback()
    try {
      const url = URL.createObjectURL(draftRecording)
      const audio = new Audio(url)
      draftAudioRef.current = audio
      setIsDraftPlaying(true)
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (draftAudioRef.current === audio) draftAudioRef.current = null
          setIsDraftPlaying(false)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          if (draftAudioRef.current === audio) draftAudioRef.current = null
          setIsDraftPlaying(false)
          reject(new Error('Unable to play draft recording'))
        }
        void audio.play().catch(reject)
      })
    } catch (reason) {
      showError(reason, 'Unable to play draft recording')
    }
  }

  async function playSavedRecording(recording: PracticeRecording): Promise<void> {
    // Saved attempt playback owns its own audio element so source and draft playback can be stopped independently.
    stopSourcePlayback()
    stopDraftPlayback()
    stopSavedPlayback()
    setDeleteError(null)

    const url = await getPracticeRecordingUrl(recording.storage_path)
    const audio = new Audio(url)
    savedAudioRef.current = audio
    setActiveSavedRecordingId(recording.id)

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        if (savedAudioRef.current === audio) savedAudioRef.current = null
        setActiveSavedRecordingId(null)
        resolve()
      }
      audio.onerror = () => {
        if (savedAudioRef.current === audio) savedAudioRef.current = null
        setActiveSavedRecordingId(null)
        reject(new Error('Unable to play saved attempt'))
      }
      void audio.play().catch(reject)
    })
  }

  async function handlePlaySaved(recording: PracticeRecording): Promise<void> {
    if (activeSavedRecordingId === recording.id) {
      stopSavedPlayback()
      return
    }

    try {
      await playSavedRecording(recording)
    } catch (reason) {
      showError(reason, 'Unable to play saved attempt')
    }
  }

  async function handleCompareLatest(): Promise<void> {
    if (!snippet || !recordings.length) return
    try {
      // Compare reuses the same source voice settings, then immediately plays the newest saved attempt for side-by-side review.
      const source = await requestTtsAudio({
        text: snippet.text,
        language: snippet.language,
        voice: getVoiceForTone(snippet.language, playbackMode === 'oral' ? 'casual' : 'neutral'),
        speed: 1,
      })
      await playBytes(source)
      await playSavedRecording(recordings[0])
    } catch (reason) {
      showError(reason, 'Unable to compare recordings')
    }
  }

  async function handleDeleteSaved(recording: PracticeRecording): Promise<void> {
    setDeleteError(null)
    setDeletingRecordingId(recording.id)

    try {
      if (activeSavedRecordingId === recording.id) stopSavedPlayback()
      await deletePracticeRecording(recording)
      setRecordings((current) => current.filter((item) => item.id !== recording.id))
      showSuccess('Saved attempt deleted.')
    } catch (reason) {
      const message = showError(reason, 'Unable to delete saved attempt')
      setDeleteError(message)
      throw new Error(message)
    } finally {
      setDeletingRecordingId(null)
    }
  }

  if (loadingRecordings || snippetQuery.isLoading) {
    return <PageMessage>Loading practice session...</PageMessage>
  }

  if (snippetQuery.error) {
    return (
      <PageMessage variant="error">
        {snippetQuery.error instanceof Error ? snippetQuery.error.message : 'Failed to load practice session'}
      </PageMessage>
    )
  }

  if (!snippet) return <PageMessage variant="error">Snippet not found.</PageMessage>

  return (
    <section className="grid gap-4">
      <PracticeSnippetCard snippet={snippet} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SourcePlaybackPanel
          isPlaying={isSourcePlaying}
          mode={playbackMode}
          onModeChange={setPlaybackMode}
          onTogglePlayback={handlePlaySource}
        />
        <AttemptPanel
          canRecord={micAllowed}
          hasDraft={Boolean(draftRecording)}
          isDraftPlaying={isDraftPlaying}
          isRecording={isRecording}
          onPlayDraft={handlePlayDraft}
          onSaveDraft={handleSaveDraft}
          onToggleRecording={() => (isRecording ? stopRecording() : startRecording())}
        />
      </div>

      <SavedAttemptsPanel
        activeRecordingId={activeSavedRecordingId}
        deleteError={deleteError}
        deletingRecordingId={deletingRecordingId}
        onCompareLatest={handleCompareLatest}
        onDeleteSaved={handleDeleteSaved}
        onPlaySaved={handlePlaySaved}
        recordings={recordings}
      />
    </section>
  )
}
