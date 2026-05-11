import { createClient } from 'jsr:@supabase/supabase-js@2'


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

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const azureSpeechKey = Deno.env.get('AZURE_SPEECH_KEY') ?? ''
const azureSpeechRegion = Deno.env.get('AZURE_SPEECH_REGION') ?? ''
const audioCacheBucket = Deno.env.get('AUDIO_CACHE_BUCKET') ?? 'audio-cache'
const audioCacheTtlDays = Number.parseInt(Deno.env.get('AUDIO_CACHE_TTL_DAYS') ?? '30', 10) || 30
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}

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


function getServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey)
}

async function getCacheEntry(service: ReturnType<typeof getServiceClient>, cacheKey: string): Promise<AudioCacheRow | null> {
  const { data, error } = await service
    .from('audio_cache')
    .select('cache_key, storage_path, expires_at')
    .eq('cache_key', cacheKey)
    .maybeSingle()

  if (error) throw error
  return data
}

async function refreshCacheExpiry(service: ReturnType<typeof getServiceClient>, cacheKey: string): Promise<void> {
  await service
    .from('audio_cache')
    .update({ expires_at: getCacheExpiresAt() })
    .eq('cache_key', cacheKey)
}

async function readCachedAudio(service: ReturnType<typeof getServiceClient>, storagePath: string): Promise<Uint8Array | null> {
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
  service: ReturnType<typeof getServiceClient>,
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
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase is not configured' }, 500)
    }
    if (!azureSpeechKey || !azureSpeechRegion) {
      return json({ error: 'Azure Speech is not configured' }, 500)
    }

    const authorization = request.headers.get('Authorization') ?? ''
    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'auth_required' }, 401)
    }

    const token = authorization.slice('Bearer '.length).trim()
    const service = getServiceClient()
    const { data: authData, error: authError } = await service.auth.getUser(token)
    if (authError || !authData.user) {
      return json({ error: 'auth_required' }, 401)
    }

    const body = await request.json() as Partial<TtsRequest>
    if (!body.text || !body.language || !body.voice) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const input: TtsRequest = {
      text: body.text,
      language: body.language,
      voice: body.voice,
      speed: typeof body.speed === 'number' ? body.speed : 1,
    }

    const cacheKey = await getCacheKey(input)
    const cacheEntry = await getCacheEntry(service, cacheKey)

    if (cacheEntry && !isCacheExpired(cacheEntry.expires_at)) {
      const cached = await readCachedAudio(service, cacheEntry.storage_path)
      if (cached) {
        void refreshCacheExpiry(service, cacheKey)
        return json({ audio: Array.from(cached) })
      }
    }

    const audio = await requestAzureAudio(buildSsml(input))
    await upsertCacheEntry(service, cacheKey, audio)

    return json({ audio: Array.from(audio) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS request failed'
    return json({ error: message }, 500)
  }
})
