/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_TTS_FUNCTION_NAME: string
  readonly VITE_OCR_FUNCTION_NAME: string
  readonly VITE_CREATE_SNIPPET_FUNCTION_NAME: string
  readonly VITE_UPDATE_SNIPPET_FUNCTION_NAME: string
  readonly VITE_DELETE_SNIPPET_FUNCTION_NAME: string
  readonly VITE_PRACTICE_RECORDINGS_BUCKET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
