import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '@/shared/types'
import {
  getCurrentSession,
  restoreSessionFromCallbackUrl,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthChanges,
} from '@/features/auth/api/supabase-auth-client'
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
    let removeAppListener: (() => void) | null = null

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

    /**
     * Native OAuth returns through an app deep link, so the callback URL must be turned into a Supabase session explicitly.
     */
    async function hydrateSessionFromCallbackUrl(url: string): Promise<void> {
      try {
        await Browser.close().catch(() => undefined)
        const restoredSession = await restoreSessionFromCallbackUrl(url)
        if (!mounted || !restoredSession) return
        void syncSession(restoredSession, true)
      } catch (reason) {
        if (!mounted) return
        showError(reason, 'Unable to finish Google sign-in')
      }
    }

    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.getLaunchUrl().then((launchUrl) => {
        if (!mounted || !launchUrl?.url) return
        void hydrateSessionFromCallbackUrl(launchUrl.url)
      })

      void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        if (!mounted || !url) return
        void hydrateSessionFromCallbackUrl(url)
      }).then((listener) => {
        removeAppListener = () => {
          void listener.remove()
        }
      })
    }

    return () => {
      mounted = false
      removeAppListener?.()
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
