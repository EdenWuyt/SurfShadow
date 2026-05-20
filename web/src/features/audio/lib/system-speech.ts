import { Capacitor } from '@capacitor/core'
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis'

interface SpeakSystemTextOptions {
  language: string
  rate?: number
  text: string
}

function supportsBrowserSpeech(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'speechSynthesis' in globalThis &&
    typeof globalThis.speechSynthesis?.speak === 'function' &&
    typeof globalThis.SpeechSynthesisUtterance === 'function'
  )
}

async function supportsNativeSpeech(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false

  try {
    const { isAvailable } = await SpeechSynthesis.isAvailable()
    return isAvailable
  } catch {
    return false
  }
}

/**
 * Reports whether "System" playback can use a platform speech engine instead of the server TTS fallback.
 */
export async function supportsSystemSpeech(): Promise<boolean> {
  if (await supportsNativeSpeech()) return true
  return supportsBrowserSpeech()
}

/**
 * Stops whichever platform speech engine currently owns playback.
 */
export async function cancelSystemSpeech(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await SpeechSynthesis.cancel().catch(() => undefined)
    await SpeechSynthesis.removeAllListeners().catch(() => undefined)
    return
  }

  if (!supportsBrowserSpeech()) return
  globalThis.speechSynthesis.cancel()
}

/**
 * Plays text through the native speech engine on mobile or the Web Speech API in browsers.
 */
export async function speakSystemText({ language, rate = 1, text }: SpeakSystemTextOptions): Promise<void> {
  if (await supportsNativeSpeech()) {
    await SpeechSynthesis.removeAllListeners().catch(() => undefined)

    const utteranceId = await SpeechSynthesis.speak({
      text,
      language,
      rate,
      queueStrategy: 'Flush',
    }).then((result) => result.utteranceId)

    await new Promise<void>((resolve, reject) => {
      let settled = false

      const finish = async (callback: () => void): Promise<void> => {
        if (settled) return
        settled = true
        await SpeechSynthesis.removeAllListeners().catch(() => undefined)
        callback()
      }

      void SpeechSynthesis.addListener('end', (event) => {
        if (event.utteranceId !== utteranceId) return
        void finish(resolve)
      })

      void SpeechSynthesis.addListener('error', (event) => {
        if (event.utteranceId !== utteranceId) return
        void finish(() => reject(new Error(event.error || 'Unable to play system speech')))
      })
    })

    return
  }

  if (!supportsBrowserSpeech()) {
    throw new Error('System speech is unavailable on this device')
  }

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = rate
    utterance.onend = () => resolve()
    utterance.onerror = () => reject(new Error('Unable to play system speech'))
    globalThis.speechSynthesis.speak(utterance)
  })
}
