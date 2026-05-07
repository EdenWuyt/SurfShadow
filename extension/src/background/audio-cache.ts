import type { AudioCacheRow, Settings } from '../types'
import { AUDIO_CACHE_TTL_DAYS } from '../config'
import { supabaseFetch } from './supabase'

export async function getCacheKey(text: string, language: string, voice: string, speed: number): Promise<string> {
  const data = new TextEncoder().encode(`${text}|${language}|${voice}|${speed}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function getValidCachedAudio(settings: Settings, cacheKey: string): Promise<Uint8Array | null> {
  const cacheEntry = await getCacheEntry(settings, cacheKey)
  if (!cacheEntry || isCacheExpired(cacheEntry.expires_at)) return null

  // The metadata row is the source of truth for cache validity.
  // If the row is still live and the object exists, extend the TTL on read.
  const cached = await readStorageObject(settings, cacheKey)
  if (cached) void refreshCacheExpiry(settings, cacheKey)
  return cached
}

export async function storeCachedAudio(settings: Settings, cacheKey: string, audioBuffer: ArrayBuffer): Promise<void> {
  // Storage and metadata writes are intentionally independent so TTS playback
  // never waits on cache bookkeeping.
  void uploadToStorage(settings, cacheKey, audioBuffer.slice(0))
  void upsertCacheEntry(settings, cacheKey)
}

function getCacheExpiresAt(): string {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + AUDIO_CACHE_TTL_DAYS)
  return expiresAt.toISOString()
}

function isCacheExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now()
}

async function getCacheEntry(settings: Settings, cacheKey: string): Promise<AudioCacheRow | null> {
  try {
    const res = await supabaseFetch(
      settings,
      `/rest/v1/audio_cache?cache_key=eq.${cacheKey}&select=cache_key,storage_path,expires_at&limit=1`,
      { method: 'GET' },
    )
    if (!res.ok) return null

    const rows = await res.json() as AudioCacheRow[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

async function upsertCacheEntry(settings: Settings, cacheKey: string): Promise<void> {
  try {
    await supabaseFetch(settings, '/rest/v1/audio_cache', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        cache_key: cacheKey,
        storage_path: `${cacheKey}.mp3`,
        expires_at: getCacheExpiresAt(),
      }),
    })
  } catch {
    // Non-critical.
  }
}

async function refreshCacheExpiry(settings: Settings, cacheKey: string): Promise<void> {
  try {
    await supabaseFetch(settings, `/rest/v1/audio_cache?cache_key=eq.${cacheKey}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ expires_at: getCacheExpiresAt() }),
    })
  } catch {
    // Non-critical.
  }
}

async function readStorageObject(settings: Settings, cacheKey: string): Promise<Uint8Array | null> {
  try {
    const res = await supabaseFetch(settings, `/storage/v1/object/audio-cache/${cacheKey}.mp3`, {
      method: 'GET',
    })
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function uploadToStorage(settings: Settings, cacheKey: string, audioBuffer: ArrayBuffer): Promise<void> {
  try {
    await supabaseFetch(settings, `/storage/v1/object/audio-cache/${cacheKey}.mp3`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
      body: audioBuffer,
    })
  } catch {
    // Non-critical: playback should still succeed even if caching fails.
  }
}
