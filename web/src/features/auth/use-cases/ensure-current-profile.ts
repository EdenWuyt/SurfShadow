import type { Profile } from '@/shared/types'
import { createProfile, getCurrentUserId, getProfileById } from '@/features/auth/repositories/profile-repository'

/**
 * Guarantees the signed-in user has a profile row before the rest of the app reads profile-backed defaults.
 */
export async function ensureCurrentProfile(): Promise<Profile | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const existingProfile = await getProfileById(userId)
  if (existingProfile) return existingProfile

  return createProfile(userId)
}
