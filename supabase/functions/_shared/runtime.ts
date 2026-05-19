import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedExtensionProtocols = ['chrome-extension://', 'moz-extension://']

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

function resolveAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin')?.trim()
  if (!origin) return null
  if (allowedExtensionProtocols.some((protocol) => origin.startsWith(protocol))) {
    return origin
  }
  if (!allowedOrigins.length) return null
  return allowedOrigins.includes(origin) ? origin : null
}

function buildCorsHeaders(request: Request): HeadersInit {
  const allowedOrigin = resolveAllowedOrigin(request)
  return allowedOrigin
    ? {
        ...BASE_CORS_HEADERS,
        'Access-Control-Allow-Origin': allowedOrigin,
        Vary: 'Origin',
      }
    : BASE_CORS_HEADERS
}

export function json(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request),
    },
  })
}

export function corsPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null

  const origin = request.headers.get('Origin')?.trim()
  if (origin && !resolveAllowedOrigin(request)) {
    return new Response('origin_not_allowed', { status: 403 })
  }

  return new Response('ok', { headers: buildCorsHeaders(request) })
}

export function assertSupabaseServerEnv(): void {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase is not configured')
  }
}

export function getServiceClient(): SupabaseClient {
  assertSupabaseServerEnv()
  return createClient(supabaseUrl, serviceRoleKey)
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get('Origin')?.trim()
  if (!origin) return
  if (!resolveAllowedOrigin(request)) {
    throw new Error('origin_not_allowed')
  }
}

export async function requireUserId(request: Request): Promise<string> {
  const authorization = request.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    throw new Error('auth_required')
  }

  const token = authorization.slice('Bearer '.length).trim()
  const supabase = getServiceClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('auth_required')
  }

  return data.user.id
}

// This maps only the shared errors that can bubble into a function-level catch block.
// Function-specific 400/404/409 responses should still be returned inline at the call site.
export function getCaughtErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error)

  switch (message) {
    case 'auth_required':
      return 401
    case 'origin_not_allowed':
      return 403
    case 'quota_exceeded':
      return 429
    default:
      return 500
  }
}
