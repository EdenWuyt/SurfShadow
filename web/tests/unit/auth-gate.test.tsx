import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthGate } from '@/features/auth/AuthGate'
import { renderWithProviders } from '../utils/render'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/features/auth/AuthProvider'

describe('AuthGate', () => {
  it('renders the loader while auth is resolving', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: true,
      profile: null,
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      user: null,
    })

    renderWithProviders(
      <AuthGate>
        <div>private app</div>
      </AuthGate>,
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders the landing page when there is no session', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profile: null,
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      user: null,
    })

    renderWithProviders(
      <AuthGate>
        <div>private app</div>
      </AuthGate>,
    )

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders children when a session exists', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profile: null,
      session: { user: { id: 'user-1' } } as never,
      signIn: vi.fn(),
      signOut: vi.fn(),
      user: { id: 'user-1' } as never,
    })

    renderWithProviders(
      <AuthGate>
        <div>private app</div>
      </AuthGate>,
    )

    expect(screen.getByText('private app')).toBeInTheDocument()
  })
})
