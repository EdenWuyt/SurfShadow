import { create } from 'zustand'

interface ErrorState {
  clearError: () => void
  clearSuccess: () => void
  message: string | null
  successMessage: string | null
  setError: (message: string) => void
  setSuccess: (message: string) => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  clearError: () => set({ message: null }),
  clearSuccess: () => set({ successMessage: null }),
  message: null,
  successMessage: null,
  setError: (message) => set({ message }),
  setSuccess: (successMessage) => set({ successMessage }),
}))

export function resolveErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback
}

export function reportError(reason: unknown, fallback: string): string {
  const message = resolveErrorMessage(reason, fallback)
  useErrorStore.getState().setError(message)
  return message
}

export function reportSuccess(message: string): string {
  useErrorStore.getState().setSuccess(message)
  return message
}
