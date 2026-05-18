// Normalizes common HTTP response checks and API error extraction.
export function isUnauthorizedStatus(status: number): boolean {
  return status === 401 || status === 403
}

export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null
  return payload?.error ?? fallback
}
