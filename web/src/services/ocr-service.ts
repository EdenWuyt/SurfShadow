import { OCR_FUNCTION_NAME, SUPABASE_URL } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { OcrResponse } from '@/shared/types'

export async function extractSnippetText(imageFile: File): Promise<OcrResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) throw new Error('auth_required')

  const formData = new FormData()
  formData.append('image', imageFile)

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${OCR_FUNCTION_NAME}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  const data = await response.json() as Partial<OcrResponse> & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'OCR request failed')
  }

  if (!data.text) {
    throw new Error('OCR returned no text')
  }

  return {
    text: data.text,
    detectedLanguage: data.detectedLanguage ?? null,
  }
}
