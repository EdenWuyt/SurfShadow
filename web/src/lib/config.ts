function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'SurfShadow'
export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
export const TTS_FUNCTION_NAME = import.meta.env.VITE_TTS_FUNCTION_NAME || 'request-tts-audio'
export const OCR_FUNCTION_NAME = import.meta.env.VITE_OCR_FUNCTION_NAME || 'extract-snippet-ocr'
export const CREATE_SNIPPET_FUNCTION_NAME =
  import.meta.env.VITE_CREATE_SNIPPET_FUNCTION_NAME || 'create-snippet'
export const UPDATE_SNIPPET_FUNCTION_NAME =
  import.meta.env.VITE_UPDATE_SNIPPET_FUNCTION_NAME || 'update-snippet'
export const DELETE_SNIPPET_FUNCTION_NAME =
  import.meta.env.VITE_DELETE_SNIPPET_FUNCTION_NAME || 'delete-snippet'
export const PRACTICE_RECORDINGS_BUCKET =
  import.meta.env.VITE_PRACTICE_RECORDINGS_BUCKET || 'practice-recordings'
