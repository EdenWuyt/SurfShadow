// Provides small JWT decoding helpers for user identity and token expiry checks.
export function getUserId(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.sub as string
  } catch {
    return null
  }
}

export function getUserEmail(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return (decoded.email as string) || null
  } catch {
    return null
  }
}

export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const expiry = getTokenExpiry(token)
  if (!expiry) return true
  return expiry <= Math.floor(Date.now() / 1000) + skewSeconds
}
