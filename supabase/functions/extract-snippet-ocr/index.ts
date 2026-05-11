import { createClient } from 'jsr:@supabase/supabase-js@2'

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

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const azureVisionEndpoint = Deno.env.get('AZURE_VISION_ENDPOINT') ?? ''
const azureVisionKey = Deno.env.get('AZURE_VISION_KEY') ?? ''
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}

function getServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey)
}

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
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase is not configured' }, 500)
    }
    if (!azureVisionEndpoint || !azureVisionKey) {
      return json({ error: 'Azure Vision is not configured' }, 500)
    }

    const authorization = request.headers.get('Authorization') ?? ''
    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'auth_required' }, 401)
    }

    const token = authorization.slice('Bearer '.length).trim()
    const supabase = getServiceClient()
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return json({ error: 'auth_required' }, 401)
    }

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
