import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  assertAllowedOrigin,
  assertSupabaseServerEnv,
  corsPreflight,
  getCaughtErrorStatus,
  getServiceClient,
  json,
  requireUserId,
} from '../_shared/runtime.ts'
interface AudioCacheRow {
  cache_key: string
  storage_path: string
  expires_at: string
}

interface TtsRequest {
  text: string
  language: string
  voice: string
  speed: number
}

const azureSpeechKey = Deno.env.get('AZURE_SPEECH_KEY') ?? ''
const azureSpeechRegion = Deno.env.get('AZURE_SPEECH_REGION') ?? ''
const audioCacheBucket = Deno.env.get('AUDIO_CACHE_BUCKET') ?? 'audio-cache'
const audioCacheTtlDays = Number.parseInt(Deno.env.get('AUDIO_CACHE_TTL_DAYS') ?? '30', 10) || 30
const maxTextLength = Number.parseInt(Deno.env.get('TTS_MAX_TEXT_LENGTH') ?? '4000', 10) || 4000
const minSpeed = Number.parseFloat(Deno.env.get('TTS_MIN_SPEED') ?? '0.5') || 0.5
const maxSpeed = Number.parseFloat(Deno.env.get('TTS_MAX_SPEED') ?? '2') || 2

function getCacheExpiresAt(): string {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + audioCacheTtlDays)
  return expiresAt.toISOString()
}

function isCacheExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now()
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSsml({ text, language, voice, speed }: TtsRequest): string {
  return `<speak version='1.0' xml:lang='${language}'><voice name='${voice}'><prosody rate='${speed}'>${escapeXml(text)}</prosody></voice></speak>`
}

async function getCacheKey({ text, language, voice, speed }: TtsRequest): Promise<string> {
  const data = new TextEncoder().encode(`${text}|${language}|${voice}|${speed}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function getCacheEntry(service: SupabaseClient, cacheKey: string): Promise<AudioCacheRow | null> {
  const { data, error } = await service
    .from('audio_cache')
    .select('cache_key, storage_path, expires_at')
    .eq('cache_key', cacheKey)
    .maybeSingle()

  if (error) throw error
  return data
}

async function refreshCacheExpiry(service: SupabaseClient, cacheKey: string): Promise<void> {
  const { error } = await service
    .from('audio_cache')
    .update({ expires_at: getCacheExpiresAt() })
    .eq('cache_key', cacheKey)

  if (error) throw error
}

async function readCachedAudio(service: SupabaseClient, storagePath: string): Promise<Uint8Array | null> {
  const { data, error } = await service.storage.from(audioCacheBucket).download(storagePath)
  if (error) return null
  return new Uint8Array(await data.arrayBuffer())
}

async function requestAzureAudio(ssml: string): Promise<Uint8Array> {
  const response = await fetch(
    `https://${azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureSpeechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    },
  )

  if (response.status === 403 || response.status === 429) {
    throw new Error('quota_exceeded')
  }
  if (!response.ok) {
    throw new Error(`Azure error ${response.status}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

async function upsertCacheEntry(
  service: SupabaseClient,
  cacheKey: string,
  audio: Uint8Array,
): Promise<void> {
  const storagePath = `${cacheKey}.mp3`

  const { error: uploadError } = await service.storage
    .from(audioCacheBucket)
    .upload(storagePath, audio, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { error: upsertError } = await service
    .from('audio_cache')
    .upsert(
      {
        cache_key: cacheKey,
        storage_path: storagePath,
        char_count: 0,
        expires_at: getCacheExpiresAt(),
      },
      { onConflict: 'cache_key' },
    )

  if (upsertError) throw upsertError
}

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    assertAllowedOrigin(request)
    assertSupabaseServerEnv()
    if (!azureSpeechKey || !azureSpeechRegion) {
      return json(request, { error: 'Azure Speech is not configured' }, 500)
    }

    await requireUserId(request)
    const service = getServiceClient()

    const body = await request.json() as Partial<TtsRequest>
    if (!body.text || !body.language || !body.voice) {
      return json(request, { error: 'Missing required fields' }, 400)
    }

    const input: TtsRequest = {
      text: body.text,
      language: body.language,
      voice: body.voice,
      speed: typeof body.speed === 'number' ? body.speed : 1,
    }

    if (input.text.length > maxTextLength) {
      return json(request, { error: `Text exceeds ${maxTextLength} characters` }, 400)
    }
    if (Number.isNaN(input.speed) || input.speed < minSpeed || input.speed > maxSpeed) {
      return json(request, { error: `Speed must be between ${minSpeed} and ${maxSpeed}` }, 400)
    }

    const cacheKey = await getCacheKey(input)
    const cacheEntry = await getCacheEntry(service, cacheKey)

    if (cacheEntry && !isCacheExpired(cacheEntry.expires_at)) {
      const cached = await readCachedAudio(service, cacheEntry.storage_path)
      if (cached) {
        void refreshCacheExpiry(service, cacheKey).catch(() => {
          // Cache expiry refresh is best-effort and should not block playback.
        })
        return json(request, { audio: Array.from(cached) })
      }
    }

    const audio = await requestAzureAudio(buildSsml(input))
    await upsertCacheEntry(service, cacheKey, audio)

    return json(request, { audio: Array.from(audio) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS request failed'
    return json(request, { error: message }, getCaughtErrorStatus(error))
  }
})
