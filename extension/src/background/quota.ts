import type { Settings } from '../types'
import { getUserId } from './jwt'
import { supabaseFetch } from './supabase'

interface ProfileQuotaRow {
  quota_used: number
  quota_reset_at: string | null
}

function getNextQuotaResetAt(from: Date): string {
  const nextReset = new Date(from)
  nextReset.setMonth(nextReset.getMonth() + 1)
  return nextReset.toISOString()
}

export async function updateQuota(settings: Settings, charCount: number): Promise<void> {
  if (!settings.accessToken) return

  const userId = getUserId(settings.accessToken)
  if (!userId) return

  try {
    const res = await supabaseFetch(
      settings,
      `/rest/v1/profiles?id=eq.${userId}&select=quota_used,quota_reset_at`,
      { method: 'GET' },
    )
    if (!res.ok) return

    const rows = await res.json() as ProfileQuotaRow[]
    if (!rows.length) return

    const { quota_used, quota_reset_at } = rows[0]
    const now = new Date()
    const resetAt = quota_reset_at ? new Date(quota_reset_at) : null

    const shouldReset = !resetAt || now >= resetAt
    const newQuota = shouldReset ? charCount : (quota_used ?? 0) + charCount
    const newReset = shouldReset ? getNextQuotaResetAt(now) : quota_reset_at

    await supabaseFetch(settings, `/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ quota_used: newQuota, quota_reset_at: newReset }),
    })
  } catch {
    // Non-critical.
  }
}
