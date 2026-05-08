// Shared types used by the background worker, content script, and popup.

export interface Language {
  code: string
  label: string
  voice: string        // neutral voice
  voiceCasual: string  // conversational voice
}

export type Tone = 'neutral' | 'casual'

export interface Settings {
  accessToken?: string
  refreshToken?: string
  defaultLanguage?: string
}

export interface AudioCacheRow {
  cache_key: string
  storage_path: string
  expires_at: string
}

// Every message the content script or popup can send to the background worker.
export type Message =
  | { type: 'REQUEST_TTS_AUDIO'; text: string; language: string; voice: string; speed: number }
  | { type: 'SAVE_SNIPPET'; text: string; language: string }
  | { type: 'DELETE_SNIPPET'; text: string; language: string }
  | { type: 'SIGN_IN' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; defaultLanguage: string }
  | { type: 'SIGN_OUT' }

// Every possible response shape the background worker can return.
export type MessageResponse =
  | { audio: number[] }
  | { success: true; email?: string }
  | { error: string }
  | Settings
  | null
