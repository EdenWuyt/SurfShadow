import { TTS_FUNCTION_NAME } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { TtsRequest, TtsResponse } from '@/shared/types'

export async function requestTtsAudio(input: TtsRequest): Promise<Uint8Array> {
  const { data, error } = await supabase.functions.invoke<TtsResponse>(TTS_FUNCTION_NAME, {
    body: input,
  })

  if (error) throw error
  if (!data?.audio) throw new Error('TTS function returned no audio')

  return new Uint8Array(data.audio)
}
