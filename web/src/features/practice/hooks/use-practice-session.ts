import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getVoiceForTone } from '@/shared/languages'
import type { PlaybackMode, PracticeRecording, Snippet } from '@/shared/types'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { getSnippetDetail } from '@/features/snippets/repositories/snippet-repository'
import {
  getPracticeRecordingPlaybackUrl,
  listPracticeRecordingsForSnippet,
  removePracticeRecordingRecord,
  savePracticeRecordingRecord,
} from '@/features/practice/repositories/practice-recording-repository'
import { requestTtsAudio } from '@/features/audio/api/tts-api'
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

interface UsePracticeSessionResult {
  activeSavedRecordingId: string | null
  deleteError: string | null
  deletingRecordingId: string | null
  draftRecording: Blob | null
  isDraftPlaying: boolean
  isRecording: boolean
  isSourcePlaying: boolean
  loading: boolean
  micAllowed: boolean
  onCompareLatest: () => Promise<void>
  onDeleteSaved: (recording: PracticeRecording) => Promise<void>
  onPlayDraft: () => Promise<void>
  onPlaySaved: (recording: PracticeRecording) => Promise<void>
  onSaveDraft: () => Promise<void>
  onToggleRecording: () => Promise<void> | void
  onToggleSourcePlayback: () => Promise<void>
  playbackMode: PlaybackMode
  recordings: PracticeRecording[]
  setPlaybackMode: (mode: PlaybackMode) => void
  snippet: Snippet | null
  queryError: unknown
}

/**
 * Coordinates snippet loading, recording lifecycle, and all three playback channels for the practice page.
 */
export function usePracticeSession(snippetId: string, userId: string | null): UsePracticeSessionResult {
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
    queryFn: () => getSnippetDetail(snippetId),
  })

  useEffect(() => {
    let mounted = true
    setLoadingRecordings(true)

    void listPracticeRecordingsForSnippet(snippetId)
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

  /**
   * Plays source audio from either browser speech synthesis or server TTS and rejects stale callbacks with one token.
   */
  async function onToggleSourcePlayback(): Promise<void> {
    const snippet = snippetQuery.data ?? null
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
          if (playbackTokenRef.current === token) setIsSourcePlaying(false)
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
        if (playbackTokenRef.current === token) setIsSourcePlaying(false)
      }
    } catch (reason) {
      setIsSourcePlaying(false)
      showError(reason, 'Unable to play source audio')
    }
  }

  /**
   * Starts microphone capture and keeps the unsaved draft local until the user explicitly saves it.
   */
  async function startRecording(): Promise<void> {
    try {
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

  /**
   * Saves the local draft recording as a persisted practice attempt.
   */
  async function onSaveDraft(): Promise<void> {
    const snippet = snippetQuery.data ?? null
    if (!draftRecording || !userId || !snippet) return

    try {
      const saved = await savePracticeRecordingRecord(userId, snippet.id, draftRecording)
      setRecordings((current) => [saved, ...current])
      setDraftRecording(null)
      showSuccess('Practice attempt saved.')
    } catch (reason) {
      showError(reason, 'Unable to save recording')
    }
  }

  /**
   * Plays or stops the unsaved local draft recording.
   */
  async function onPlayDraft(): Promise<void> {
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
    stopSourcePlayback()
    stopDraftPlayback()
    stopSavedPlayback()
    setDeleteError(null)

    const url = await getPracticeRecordingPlaybackUrl(recording.storage_path)
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

  /**
   * Plays or stops one persisted saved attempt.
   */
  async function onPlaySaved(recording: PracticeRecording): Promise<void> {
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

  /**
   * Compares the current source voice against the most recent saved attempt.
   */
  async function onCompareLatest(): Promise<void> {
    const snippet = snippetQuery.data ?? null
    if (!snippet || !recordings.length) return

    try {
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

  /**
   * Deletes one saved attempt and leaves confirm-dialog errors in local state when deletion fails.
   */
  async function onDeleteSaved(recording: PracticeRecording): Promise<void> {
    setDeleteError(null)
    setDeletingRecordingId(recording.id)

    try {
      if (activeSavedRecordingId === recording.id) stopSavedPlayback()
      await removePracticeRecordingRecord(recording)
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

  return {
    activeSavedRecordingId,
    deleteError,
    deletingRecordingId,
    draftRecording,
    isDraftPlaying,
    isRecording,
    isSourcePlaying,
    loading: loadingRecordings || snippetQuery.isLoading,
    micAllowed,
    onCompareLatest,
    onDeleteSaved,
    onPlayDraft,
    onPlaySaved,
    onSaveDraft,
    onToggleRecording: () => {
      if (isRecording) {
        stopRecording()
        return
      }
      return startRecording()
    },
    onToggleSourcePlayback,
    playbackMode,
    queryError: snippetQuery.error,
    recordings,
    setPlaybackMode,
    snippet: snippetQuery.data ?? null,
  }
}
