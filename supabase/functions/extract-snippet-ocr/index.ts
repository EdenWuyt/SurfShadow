import {
  assertSupabaseServerEnv,
  corsPreflight,
  json,
  requireUserId,
} from '../_shared/runtime.ts'

interface AzureReadLine {
  text?: string
}

interface AzureReadBlock {
  lines?: AzureReadLine[]
}

interface AzureOcrResponse {
  readResult?: {
    blocks?: AzureReadBlock[]
  }
}

const azureVisionEndpoint = Deno.env.get('AZURE_VISION_ENDPOINT') ?? ''
const azureVisionKey = Deno.env.get('AZURE_VISION_KEY') ?? ''

function getAnalyzeUrl(): string {
  const baseUrl = azureVisionEndpoint.endsWith('/') ? azureVisionEndpoint : `${azureVisionEndpoint}/`
  const url = new URL('computervision/imageanalysis:analyze', baseUrl)
  url.searchParams.set('api-version', '2024-02-01')
  url.searchParams.set('features', 'read')
  return url.toString()
}

function extractText(payload: AzureOcrResponse): string {
  const lines = payload.readResult?.blocks
    ?.flatMap((block) => block.lines ?? [])
    .map((line) => line.text?.trim() ?? '')
    .filter(Boolean) ?? []

  return lines.join('\n').trim()
}

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    assertSupabaseServerEnv()
    if (!azureVisionEndpoint || !azureVisionKey) {
      return json({ error: 'Azure Vision is not configured' }, 500)
    }

    await requireUserId(request)

    const formData = await request.formData()
    const image = formData.get('image')
    if (!(image instanceof File)) {
      return json({ error: 'Missing image upload' }, 400)
    }

    const imageBytes = await image.arrayBuffer()
    const azureResponse = await fetch(getAnalyzeUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': image.type || 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': azureVisionKey,
      },
      body: imageBytes,
    })

    if (!azureResponse.ok) {
      return json({ error: `Azure Vision error ${azureResponse.status}` }, 502)
    }

    const payload = await azureResponse.json() as AzureOcrResponse
    const text = extractText(payload)
    if (!text) {
      return json({ error: 'No readable text found in image' }, 422)
    }

    return json({
      text,
      detectedLanguage: null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR request failed'
    return json({ error: message }, 500)
  }
})
