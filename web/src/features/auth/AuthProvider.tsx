import { createContext, useContext, useEffect, useState, type JSX, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ensureCurrentProfile } from '@/services/profile-service'
import type { Profile } from '@/shared/types'
import { showError } from '@/stores/feedback-store'

interface AuthContextValue {
  loading: boolean
  profile: Profile | null
  session: Session | null
  user: User | null
  signIn(): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let mounted = true

    // Initial session bootstrap handles the persisted-tab case before any auth event fires.
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (!data.session) {
        setProfile(null)
        setLoading(false)
        return
      }

      void ensureCurrentProfile()
        .then((nextProfile) => {
          if (!mounted) return
          setProfile(nextProfile)
          setLoading(false)
        })
        .catch(() => {
          if (!mounted) return
          setProfile(null)
          setLoading(false)
        })
    })

    // Auth state changes re-run profile hydration so first sign-in and refresh-token restores share one path.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      void ensureCurrentProfile()
        .then((nextProfile) => {
          if (!mounted) return
          setProfile(nextProfile)
          setLoading(false)
        })
        .catch(() => {
          if (!mounted) return
          setProfile(null)
          setLoading(false)
        })
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function signIn(): Promise<void> {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      })
    } catch (reason) {
      showError(reason, 'Unable to start Google sign-in')
    }
  }

  async function signOut(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (reason) {
      showError(reason, 'Unable to sign out')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        profile,
        session,
        user: session?.user ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
