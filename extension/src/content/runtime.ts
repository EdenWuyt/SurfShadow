import type { Message, MessageResponse } from '../types'

let isSignedIn = false
let syncBarAuth: ((signedIn: boolean) => void) | null = null
let onContextInvalidated: (() => void) | null = null

export function setBarAuthSync(sync: ((signedIn: boolean) => void) | null): void {
  syncBarAuth = sync
}

export function setContextInvalidatedHandler(handler: (() => void) | null): void {
  onContextInvalidated = handler
}

export function getSignedInState(): boolean {
  return isSignedIn
}

export async function sendMessage(msg: Message): Promise<MessageResponse> {
  try {
    return await chrome.runtime.sendMessage(msg) as MessageResponse
  } catch {
    onContextInvalidated?.()
    return null
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !('accessToken' in changes)) return

  isSignedIn = Boolean(changes.accessToken?.newValue)
  syncBarAuth?.(isSignedIn)
})

export function syncSignedInState(accessToken?: string): void {
  isSignedIn = Boolean(accessToken)
  syncBarAuth?.(isSignedIn)
}
