// Handles Supabase OAuth token validation, refresh, and interactive Google sign-in.
import { SUPABASE_ANON, SUPABASE_URL } from '../config'
import { ensureProfile } from './profile'
import { getUserEmail } from './jwt'

export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return res.ok
  } catch {
    return false
  }
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      return { error: `Refresh failed: ${res.status}` }
    }

    const data = await res.json() as { access_token?: string; refresh_token?: string }
    if (!data.access_token || !data.refresh_token) {
      return { error: 'Refresh response missing token' }
    }

    await chrome.storage.local.set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  } catch {
    return { error: 'Refresh request failed' }
  }
}

export async function signIn(): Promise<{ success: true; email?: string } | { error: string }> {
  if (!SUPABASE_URL) return { error: 'Supabase not configured' }

  const redirectUrl = `https://${chrome.runtime.id}.chromiumapp.org/`
  const authParams = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectUrl,
    prompt: 'select_account',
  })
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${authParams.toString()}`

  return new Promise((resolve) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        resolve({ error: chrome.runtime.lastError?.message ?? 'Cancelled' })
        return
      }

      const url = new URL(responseUrl)
      const params = new URLSearchParams(url.hash.slice(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken) {
        resolve({ error: 'No token in response' })
        return
      }

      void chrome.storage.local
        .set({ accessToken, refreshToken })
        .then(async () => {
          const stored = await chrome.storage.local.get([
            'defaultLanguage',
          ])
          await ensureProfile({
            accessToken,
            refreshToken: refreshToken ?? undefined,
            defaultLanguage: stored.defaultLanguage as string | undefined,
          })
          resolve({ success: true, email: getUserEmail(accessToken) ?? undefined })
        })
        .catch(() => {
          resolve({ error: 'Unable to initialize profile' })
        })
    })
  })
}
