import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { renderWithProviders } from '../utils/render'

const {
  ensureCurrentProfileMock,
  getSessionMock,
  onAuthStateChangeMock,
  showErrorMock,
  signInWithOAuthMock,
  signOutMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signOutMock: vi.fn(),
  ensureCurrentProfileMock: vi.fn(),
  showErrorMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signInWithOAuth: signInWithOAuthMock,
      signOut: signOutMock,
    },
  },
}))

vi.mock('@/features/auth/use-cases/ensure-current-profile', () => ({
  ensureCurrentProfile: ensureCurrentProfileMock,
}))

vi.mock('@/stores/feedback-store', async () => {
  const actual = await vi.importActual<typeof import('@/stores/feedback-store')>('@/stores/feedback-store')
  return {
    ...actual,
    showError: showErrorMock,
  }
})

function AuthHarness() {
  const auth = useAuth()

  return (
    <div>
      <div>{auth.loading ? 'loading' : 'ready'}</div>
      <div>{auth.session ? 'session' : 'no-session'}</div>
      <div>{auth.profile?.default_language ?? 'no-profile'}</div>
      <button onClick={() => void auth.signIn()} type="button">
        sign in
      </button>
      <button onClick={() => void auth.signOut()} type="button">
        sign out
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    const unsubscribe = vi.fn()
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe } } })
    ensureCurrentProfileMock.mockReset()
    signInWithOAuthMock.mockReset()
    signOutMock.mockReset()
    showErrorMock.mockReset()
  })

  it('resolves to signed-out state when no session exists', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })

    renderWithProviders(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    await screen.findByText('ready')
    expect(screen.getByText('no-session')).toBeInTheDocument()
    expect(screen.getByText('no-profile')).toBeInTheDocument()
  })

  it('loads the current profile when a session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })
    ensureCurrentProfileMock.mockResolvedValue({
      id: 'user-1',
      default_language: 'ja-JP',
      quota_used: 0,
      quota_reset_at: null,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    })

    renderWithProviders(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    await screen.findByText('ready')
    expect(screen.getByText('session')).toBeInTheDocument()
    expect(screen.getByText('ja-JP')).toBeInTheDocument()
  })

  it('calls Supabase OAuth and sign-out actions', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })

    renderWithProviders(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    await screen.findByText('ready')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'sign in' }))
    await user.click(screen.getByRole('button', { name: 'sign out' }))

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled()
    })
  })
})
