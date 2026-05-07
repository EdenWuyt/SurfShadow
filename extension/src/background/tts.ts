import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '../config'
import { getSettings } from './settings'
import { getCacheKey, getValidCachedAudio, storeCachedAudio } from './audio-cache'
import { updateQuota } from './quota'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSsml(text: string, language: string, voice: string, speed: number): string {
  return `<speak version='1.0' xml:lang='${language}'><voice name='${voice}'><prosody rate='${speed}'>${escapeXml(text)}</prosody></voice></speak>`
}

async function requestAzureAudio(ssml: string): Promise<ArrayBuffer | { error: string }> {
  const azureRes = await fetch(
    `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    },
  )

  if (azureRes.status === 403 || azureRes.status === 429) return { error: 'quota_exceeded' }
  if (!azureRes.ok) return { error: `Azure error ${azureRes.status}` }

  return azureRes.arrayBuffer()
}

export async function getAudio(
  text: string,
  language: string,
  voice: string,
  speed = 1.0,
): Promise<{ audio: number[] } | { error: string }> {
  try {
    const settings = await getSettings()

    if (!settings.accessToken) return { error: 'auth_required' }
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) return { error: 'Azure not configured' }

    const cacheKey = await getCacheKey(text, language, voice, speed)
    const cached = await getValidCachedAudio(settings, cacheKey)
    if (cached) return { audio: Array.from(cached) }

    const audioResult = await requestAzureAudio(buildSsml(text, language, voice, speed))
    if ('error' in audioResult) return audioResult

    void storeCachedAudio(settings, cacheKey, audioResult)
    void updateQuota(settings, text.length)

    return { audio: Array.from(new Uint8Array(audioResult)) }
  } catch {
    return { error: 'TTS request failed' }
  }
}
