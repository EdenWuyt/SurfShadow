declare const __AZURE_SPEECH_KEY__: string
declare const __AZURE_SPEECH_REGION__: string
declare const __AUDIO_CACHE_TTL_DAYS__: string

export const SUPABASE_URL = 'https://jfarzdwgmshcucwpoecv.supabase.co'
export const SUPABASE_ANON = 'sb_publishable_TS2aOYj-37MQkkanbFaCmQ_cO9-D4NM'
export const AZURE_SPEECH_KEY = __AZURE_SPEECH_KEY__
export const AZURE_SPEECH_REGION = __AZURE_SPEECH_REGION__
export const AUDIO_CACHE_TTL_DAYS = Number.parseInt(__AUDIO_CACHE_TTL_DAYS__, 10) || 30
