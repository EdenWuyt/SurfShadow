import type { Settings } from '../types'

function parseEmail(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return (decoded.email as string) || null
  } catch {
    return null
  }
}

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

function renderState(settings: Partial<Settings>): void {
  $<HTMLSelectElement>('default-lang').value = settings.defaultLanguage ?? 'en-US'

  const authStatus = $<HTMLSpanElement>('auth-status')
  const btnAuth = $<HTMLButtonElement>('btn-auth')

  if (settings.accessToken) {
    authStatus.textContent = parseEmail(settings.accessToken) ?? 'Signed in'
    btnAuth.textContent = 'Sign out'
    btnAuth.dataset.mode = 'signout'
  } else {
    authStatus.textContent = 'Not signed in'
    btnAuth.textContent = 'Sign in with Google'
    btnAuth.dataset.mode = 'signin'
  }
}

async function loadState(): Promise<void> {
  const localSettings = await chrome.storage.local.get(['accessToken', 'defaultLanguage'])
  renderState(localSettings)

  const settings = (await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }) as Settings | null) ?? {}
  renderState(settings)
}

$<HTMLButtonElement>('btn-auth').addEventListener('click', async () => {
  const btn = $<HTMLButtonElement>('btn-auth')
  const mode = btn.dataset.mode

  btn.disabled = true

  if (mode === 'signout') {
    await chrome.runtime.sendMessage({ type: 'SIGN_OUT' })
  } else {
    btn.textContent = 'Opening...'
    const result = await chrome.runtime.sendMessage({ type: 'SIGN_IN' }) as { error?: string }
    if (result?.error) {
      $<HTMLSpanElement>('auth-status').textContent = `Error: ${result.error}`
    }
  }

  btn.disabled = false
  await loadState()
})

$<HTMLButtonElement>('btn-save').addEventListener('click', async () => {
  const language = $<HTMLSelectElement>('default-lang').value

  await chrome.runtime.sendMessage({
    type: 'SAVE_SETTINGS',
    defaultLanguage: language,
  })

  const status = $<HTMLDivElement>('save-status')
  status.textContent = 'Saved'
  setTimeout(() => { status.textContent = '' }, 1500)
})

void loadState()
