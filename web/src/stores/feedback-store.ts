import { create } from 'zustand'

interface FeedbackState {
  clearErrorMessage: () => void
  clearSuccessMessage: () => void
  errorMessage: string | null
  successMessage: string | null
  setErrorMessage: (message: string) => void
  setSuccessMessage: (message: string) => void
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  clearErrorMessage: () => set({ errorMessage: null }),
  clearSuccessMessage: () => set({ successMessage: null }),
  errorMessage: null,
  successMessage: null,
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setSuccessMessage: (successMessage) => set({ successMessage }),
}))

// Feedback helpers keep feature code on one global banner path instead of reimplementing message extraction everywhere.
export function resolveErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback
}

export function showError(reason: unknown, fallback: string): string {
  const message = resolveErrorMessage(reason, fallback)
  useFeedbackStore.getState().setErrorMessage(message)
  return message
}

export function showSuccess(message: string): string {
  useFeedbackStore.getState().setSuccessMessage(message)
  return message
}
