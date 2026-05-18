import { getSettings } from './settings'
import { supabaseFetch } from './supabase'

export async function getAudio(
  text: string,
  language: string,
  voice: string,
  speed = 1.0,
): Promise<{ audio: number[] } | { error: string }> {
  try {
    const settings = await getSettings()
    const response = await supabaseFetch(settings, '/functions/v1/request-tts-audio', {
      method: 'POST',
      body: JSON.stringify({
        text,
        language,
        voice,
        speed,
      }),
    })

    if (response.ok) {
      const payload = await response.json() as { audio: number[] }
      return { audio: payload.audio }
    }

    if (response.status === 401 || response.status === 403) {
      return { error: 'auth_required' }
    }

    const payload = await response.json().catch(() => null) as { error?: string } | null
    return { error: payload?.error ?? 'TTS request failed' }
  } catch {
    return { error: 'TTS request failed' }
  }
}
