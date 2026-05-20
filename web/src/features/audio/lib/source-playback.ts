import type { RefObject } from 'react'
import { requestTtsAudio } from '@/features/audio/api/tts-api'
import { speakSystemText, supportsSystemSpeech } from '@/features/audio/lib/system-speech'
import { getVoiceForTone } from '@/shared/languages'
import type { PlaybackMode, Snippet } from '@/shared/types'

interface PlayManagedAudioOptions {
  audioRef: RefObject<HTMLAudioElement | null>
  bytes: Uint8Array
  failureMessage: string
  isTokenCurrent: () => boolean
  onStop: () => void
}

export type SourcePlaybackResult = 'played' | 'unavailable'

interface PlaySourceSnippetOptions {
  audioRef: RefObject<HTMLAudioElement | null>
  isTokenCurrent: () => boolean
  mode: PlaybackMode
  onStop: () => void
  onSystemUnavailable: () => void
  snippet: Snippet
}

/**
 * Shared audio-element playback keeps the generated-Audio path on one end/error/cleanup contract.
 * The token check lets callers ignore late completions after another playback request has taken ownership.
 */
async function playManagedAudio({
  audioRef,
  bytes,
  failureMessage,
  isTokenCurrent,
  onStop,
}: PlayManagedAudioOptions): Promise<void> {
  const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  const player = new Audio(url)
  audioRef.current = player

  await new Promise<void>((resolve, reject) => {
    player.onerror = () => {
      URL.revokeObjectURL(url)
      if (audioRef.current === player) audioRef.current = null
      if (isTokenCurrent()) onStop()
      reject(new Error(failureMessage))
    }
    player.onended = () => {
      URL.revokeObjectURL(url)
      if (audioRef.current === player) audioRef.current = null
      if (isTokenCurrent()) onStop()
      resolve()
    }
    void player.play().catch(reject)
  })
}

/**
 * Source playback uses one decision tree everywhere:
 * 1. fail fast if "System" is selected on a device with no system speech engine
 * 2. use platform system speech when "System" is available
 * 3. otherwise request the server TTS voice that matches the selected tone
 *
 * The helper is intentionally UI-agnostic. Callers own which local state to clear and how to surface errors.
 */
export async function playSourceSnippet({
  audioRef,
  isTokenCurrent,
  mode,
  onStop,
  onSystemUnavailable,
  snippet,
}: PlaySourceSnippetOptions): Promise<SourcePlaybackResult> {
  if (mode === 'system' && !(await supportsSystemSpeech())) {
    onStop()
    onSystemUnavailable()
    return 'unavailable'
  }

  if (mode === 'system') {
    await speakSystemText({
      text: snippet.text,
      language: snippet.language,
      rate: 1,
    })
    if (isTokenCurrent()) onStop()
    return 'played'
  }

  const audio = await requestTtsAudio({
    text: snippet.text,
    language: snippet.language,
    voice: getVoiceForTone(snippet.language, mode === 'neutral' ? 'neutral' : 'casual'),
    speed: 1,
  })

  if (!isTokenCurrent()) return 'played'

  await playManagedAudio({
    audioRef,
    bytes: audio,
    failureMessage: 'Unable to play source audio',
    isTokenCurrent,
    onStop,
  })

  return 'played'
}
