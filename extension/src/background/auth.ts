import { SUPABASE_ANON, SUPABASE_URL } from '../config'
import { getUserEmail } from './jwt'

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
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`

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

      chrome.storage.local.set({ accessToken, refreshToken }, () =>
        resolve({ success: true, email: getUserEmail(accessToken) ?? undefined }),
      )
    })
  })
}
