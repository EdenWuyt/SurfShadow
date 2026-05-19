import { TTS_FUNCTION_NAME, TTS_MAX_TEXT_LENGTH } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { TtsRequest, TtsResponse } from '@/shared/types'

// TTS requests stay thin at the API layer: validate the client-side limit, invoke the function, and return bytes.
export async function requestTtsAudio(input: TtsRequest): Promise<Uint8Array> {
  if (input.text.length > TTS_MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds ${TTS_MAX_TEXT_LENGTH} characters`)
  }

  const { data, error } = await supabase.functions.invoke<TtsResponse>(TTS_FUNCTION_NAME, {
    body: input,
  })

  if (error) throw error
  if (!data?.audio) throw new Error('TTS function returned no audio')

  return new Uint8Array(data.audio)
}
