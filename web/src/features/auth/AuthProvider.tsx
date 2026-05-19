import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useAuthSession } from '@/features/auth/hooks/use-auth-session'
import type { Profile } from '@/shared/types'

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
  const { loading, profile, session, signIn, signOut } = useAuthSession()

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
