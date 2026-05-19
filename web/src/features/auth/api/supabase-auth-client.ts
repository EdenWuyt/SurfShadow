import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
 * Starts the Google OAuth redirect flow for the current browser origin.
 */
export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
    },
  })
}

/**
 * Clears the current Supabase browser session.
 */
export async function signOutCurrentUser(): Promise<void> {
  await supabase.auth.signOut()
}
