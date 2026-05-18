import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}

export function corsPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null

  return new Response('ok', { headers: CORS_HEADERS })
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
