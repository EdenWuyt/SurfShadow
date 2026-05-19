import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '@/shared/types'
import { getCurrentSession, signInWithGoogle, signOutCurrentUser, subscribeToAuthChanges } from '@/features/auth/api/supabase-auth-client'
import { ensureCurrentProfile } from '@/features/auth/use-cases/ensure-current-profile'
import { showError } from '@/stores/feedback-store'

interface AuthSessionState {
  loading: boolean
  profile: Profile | null
  session: Session | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

async function hydrateProfileForSession(session: Session | null): Promise<Profile | null> {
  if (!session) return null
  return ensureCurrentProfile()
}

/**
 * Owns browser auth bootstrap and keeps profile hydration aligned with the currently active session.
 */
export function useAuthSession(): AuthSessionState {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let mounted = true

    /**
     * Loads the session first, then hydrates the matching profile so the provider exposes one consistent auth snapshot.
     */
    async function syncSession(nextSession: Session | null, shouldShowLoading: boolean): Promise<void> {
      if (shouldShowLoading && mounted) setLoading(true)

      try {
        const nextProfile = await hydrateProfileForSession(nextSession)
        if (!mounted) return
        setSession(nextSession)
        setProfile(nextProfile)
      } catch {
        if (!mounted) return
        setSession(nextSession)
        setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void getCurrentSession().then((nextSession) => {
      if (!mounted) return
      void syncSession(nextSession, false)
    })

    const unsubscribe = subscribeToAuthChanges((_event, nextSession) => {
      if (!mounted) return
      void syncSession(nextSession, true)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  /**
   * Starts Google sign-in and reports any browser-side failure before the redirect happens.
   */
  async function signIn(): Promise<void> {
    try {
      await signInWithGoogle()
    } catch (reason) {
      showError(reason, 'Unable to start Google sign-in')
    }
  }

  /**
   * Ends the active browser session and keeps the auth provider on the global feedback path for failures.
   */
  async function signOut(): Promise<void> {
    try {
      await signOutCurrentUser()
    } catch (reason) {
      showError(reason, 'Unable to sign out')
    }
  }

  return { loading, profile, session, signIn, signOut }
}
