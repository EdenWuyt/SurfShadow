import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const MOBILE_AUTH_REDIRECT_URL = 'com.surfshadow.app://auth/callback'

function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Native builds must return through a custom app scheme instead of the embedded localhost origin.
 */
export function getAuthRedirectUrl(): string {
  return isNativeApp() ? MOBILE_AUTH_REDIRECT_URL : window.location.origin
}

/**
 * Reads the current browser session restored by Supabase auth persistence.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Subscribes to auth transitions so feature hooks can react to sign-in, sign-out, and token refresh.
 */
export function subscribeToAuthChanges(
  onChange: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange(onChange)
  return () => data.subscription.unsubscribe()
}

/**
 * Starts the Google OAuth redirect flow for the active platform's callback URL.
 */
export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: isNativeApp(),
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error) throw error

  // Native OAuth must open the provider URL explicitly so the browser returns through the custom deep link.
  if (isNativeApp() && data?.url) {
    await Browser.open({ url: data.url })
  }
}

/**
 * Supabase may return OAuth state in either the query string or hash fragment depending on the flow and platform.
 */
function getCallbackParams(url: string): URLSearchParams {
  const parsed = new URL(url)
  const queryParams = new URLSearchParams(parsed.search)
  if ([...queryParams.keys()].length > 0) return queryParams
  return new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash)
}

/**
 * Converts the OAuth callback URL from a browser redirect or native deep link into a persisted Supabase session.
 */
export async function restoreSessionFromCallbackUrl(url: string): Promise<Session | null> {
  const params = getCallbackParams(url)
  const code = params.get('code')

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return data.session
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) return null

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) throw error
  return data.session
}

/**
 * Clears the current Supabase browser session.
 */
export async function signOutCurrentUser(): Promise<void> {
  await supabase.auth.signOut()
}
