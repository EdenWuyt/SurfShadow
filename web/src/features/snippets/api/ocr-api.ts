import {
  OCR_ALLOWED_IMAGE_TYPES,
  OCR_FUNCTION_NAME,
  OCR_MAX_IMAGE_BYTES,
  SUPABASE_URL,
} from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { OcrResponse } from '@/shared/types'

// Client-side OCR validation rejects obviously bad files before the request reaches the function.
export function validateOcrImage(imageFile: File): void {
  if (!OCR_ALLOWED_IMAGE_TYPES.includes(imageFile.type as (typeof OCR_ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error('Unsupported image type')
  }
  if (imageFile.size > OCR_MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${OCR_MAX_IMAGE_BYTES} bytes`)
  }
}

// OCR is still invoked directly from the browser, but only after validating the file and current session.
export async function extractSnippetText(imageFile: File): Promise<OcrResponse> {
  validateOcrImage(imageFile)

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
