import { useEffect, useRef, useState, type RefObject } from 'react'
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
import {
  cancelNativeRecording,
  canUseNativeRecorder,
  requestNativeRecorderPermission,
  startNativeRecording,
  stopNativeRecording,
} from '@/features/practice/api/native-recorder'
import { requestTtsAudio } from '@/features/audio/api/tts-api'
import { playSourceSnippet } from '@/features/audio/lib/source-playback'
import { cancelSystemSpeech } from '@/features/audio/lib/system-speech'
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

function stopAudioRef(audioRef: RefObject<HTMLAudioElement | null>): void {
  if (!audioRef.current) return
  audioRef.current.pause()
  audioRef.current.currentTime = 0
  audioRef.current = null
}

function pauseAudioRef(audioRef: RefObject<HTMLAudioElement | null>): void {
  audioRef.current?.pause()
  audioRef.current = null
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
  // This error state is only for the saved-attempt delete confirm flow and stays local to that modal path.
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingRecordingId, setDeletingRecordingId] = useState<string | null>(null)
  const [isDraftPlaying, setIsDraftPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('neutral')
  const [isSourcePlaying, setIsSourcePlaying] = useState(false)
  const [micAllowed, setMicAllowed] = useState(true)
  const [loadingRecordings, setLoadingRecordings] = useState(true)
  const usesNativeRecorder = canUseNativeRecorder()

  const snippetQuery = useQuery({
    queryKey: snippetQueryKeys.detail(snippetId),
    queryFn: () => getSnippetDetail(snippetId),
  })

  /**
   * Source, unsaved draft, and saved-attempt playback are mutually exclusive so the user hears only one channel at a time.
   */
  function stopNonSourcePlayback(): void {
    stopDraftPlayback()
    stopSavedPlayback()
  }

  /**
   * Shared audio-element wiring keeps the three playback channels on one consistent start/end/error contract.
   */
  async function playAudioUrl(
    url: string,
    audioTarget: RefObject<HTMLAudioElement | null>,
    onStart: () => void,
    onStop: () => void,
    failureMessage: string,
  ): Promise<void> {
    const audio = new Audio(url)
    audioTarget.current = audio
    onStart()

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        if (audioTarget.current === audio) audioTarget.current = null
        onStop()
        resolve()
      }
      audio.onerror = () => {
        if (audioTarget.current === audio) audioTarget.current = null
        onStop()
        reject(new Error(failureMessage))
      }
      void audio.play().catch(reject)
    })
  }

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
      void cancelSystemSpeech()
      if (usesNativeRecorder) {
        void cancelNativeRecording().catch(() => undefined)
      }
      // Unmount only needs to silence and release the current players; rewinding them has no value once the hook is disposing.
      pauseAudioRef(audioRef)
      pauseAudioRef(draftAudioRef)
      pauseAudioRef(savedAudioRef)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [snippetId])

  function stopSourcePlayback(): void {
    playbackTokenRef.current += 1
    void cancelSystemSpeech()
    stopAudioRef(audioRef)
    setIsSourcePlaying(false)
  }

  function stopDraftPlayback(): void {
    stopAudioRef(draftAudioRef)
    setIsDraftPlaying(false)
  }

  function stopSavedPlayback(): void {
    stopAudioRef(savedAudioRef)
    setActiveSavedRecordingId(null)
  }

  /**
   * Source playback is shared with the library hook, but practice still owns which other channels must be stopped first.
   * The playback token keeps one source request authoritative when the user taps stop, changes mode, or starts another clip.
   */
  async function onToggleSourcePlayback(): Promise<void> {
    const snippet = snippetQuery.data ?? null
    if (!snippet) return
    if (isSourcePlaying) {
      stopSourcePlayback()
      return
    }

    stopNonSourcePlayback()
    const token = playbackTokenRef.current + 1
    playbackTokenRef.current = token
    setIsSourcePlaying(true)
    try {
      await playSourceSnippet({
        audioRef,
        isTokenCurrent: () => playbackTokenRef.current === token,
        mode: playbackMode,
        onStop: () => setIsSourcePlaying(false),
        onSystemUnavailable: () => {
          showError(new Error('System speech is unavailable on this device'), 'System speech is unavailable on this device')
        },
        snippet,
      })
    } catch (reason) {
      setIsSourcePlaying(false)
      showError(reason, 'Unable to play source audio')
    }
  }

  /**
   * Starts microphone capture and keeps the unsaved draft local until the user explicitly saves it.
   */
  async function startRecording(): Promise<void> {
    if (usesNativeRecorder) {
      try {
        const granted = await requestNativeRecorderPermission()
        if (!granted) {
          setMicAllowed(false)
          showError(new Error('Microphone permission is blocked.'), 'Microphone permission is blocked. You can still listen and review saved attempts.')
          return
        }

        setMicAllowed(true)
        setDraftRecording(null)
        await startNativeRecording()
        setIsRecording(true)
        return
      } catch (reason) {
        setMicAllowed(false)
        showError(reason, 'Unable to start recording. You can still listen and review saved attempts.')
        return
      }
    }

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
      showError(reason, 'Unable to start recording. You can still listen and review saved attempts.')
    }
  }

  async function stopRecording(): Promise<void> {
    if (usesNativeRecorder) {
      try {
        const blob = await stopNativeRecording()
        setDraftRecording(blob)
        stopDraftPlayback()
        setIsRecording(false)
      } catch (reason) {
        setIsRecording(false)
        showError(reason, 'Unable to stop recording')
      }
      return
    }

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
      await playAudioUrl(
        url,
        draftAudioRef,
        () => setIsDraftPlaying(true),
        () => {
          URL.revokeObjectURL(url)
          setIsDraftPlaying(false)
        },
        'Unable to play draft recording',
      )
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
    await playAudioUrl(
      url,
      savedAudioRef,
      () => setActiveSavedRecordingId(recording.id),
      () => setActiveSavedRecordingId(null),
      'Unable to play saved attempt',
    )
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
        return stopRecording()
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
