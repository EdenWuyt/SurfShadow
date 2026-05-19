import type { JSX, ReactNode } from 'react'
import { PageLoader } from '@/components/feedback/PageLoader'
import { MarketingLanding } from '@/features/auth/components/MarketingLanding'
import { useAuth } from './AuthProvider'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps): JSX.Element {
  const { loading, session, signIn } = useAuth()

  if (loading) return <PageLoader />

  if (!session) return <MarketingLanding onSignIn={signIn} />

  return <>{children}</>
}
