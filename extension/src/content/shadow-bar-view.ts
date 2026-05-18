// Renders the Shadow Bar DOM and exposes imperative view helpers for its controls.
import type { Language } from '../types'

export interface ShadowBarView {
  host: HTMLDivElement
  btnSystem: HTMLButtonElement
  btnNeural: HTMLButtonElement
  btnCasual: HTMLButtonElement
  btnAuth: HTMLButtonElement
  btnSave: HTMLButtonElement
  btnRecord: HTMLButtonElement
  btnPlay: HTMLButtonElement
  btnClose: HTMLButtonElement
  speedSelect: HTMLSelectElement
  langSelect: HTMLSelectElement
  setAITTSVisibility(visible: boolean): void
  clearStatus(): void
  showStatus(message: string, duration?: number): void
  syncSaveButton(saved: boolean): void
  restorePlaybackButton(button: HTMLButtonElement): void
  markPlaybackButtonActive(button: HTMLButtonElement, stopLabel: string): void
}

export function createShadowBarView(
  languages: Language[],
  isSignedIn: boolean,
): ShadowBarView {
  const host = document.createElement('div')
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;'

  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      :host {
        --bg: #1e1e2e;
        --border: #45475a;
        --btn-bg: #313244;
        --btn-text: #cdd6f4;
        --btn-hover: #585b70;
        --sep: #45475a;
        --recording-bg: #f38ba8;
        --recording-text: #1e1e2e;
        --success-bg: #a6e3a1;
        --success-text: #1e1e2e;
      }

      @media (prefers-color-scheme: light) {
        :host {
          --bg: #ffffff;
          --border: #d0d0d0;
          --btn-bg: #f0f0f0;
          --btn-text: #333333;
          --btn-hover: #dcdcdc;
          --sep: #d0d0d0;
          --recording-bg: #e53935;
          --recording-text: #ffffff;
          --success-bg: #2e7d32;
          --success-text: #ffffff;
        }
      }

      .bar {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 6px 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        user-select: none;
        white-space: nowrap;
      }

      @media (prefers-color-scheme: light) {
        .bar { box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
      }

      button {
        background: var(--btn-bg);
        color: var(--btn-text);
        border: none;
        border-radius: 5px;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 12px;
        line-height: 1.4;
        transition: background 0.1s;
      }

      button:hover:not(:disabled) { background: var(--btn-hover); }
      button:disabled { opacity: 0.35; cursor: not-allowed; }
      button.playing { background: #89b4fa; color: #11111b; }
      button.recording { background: var(--recording-bg); color: var(--recording-text); }
      button.success { background: var(--success-bg); color: var(--success-text); }

      @media (prefers-color-scheme: light) {
        button.playing { background: #1d4ed8; color: #ffffff; }
      }

      .btn-close {
        background: none;
        color: var(--btn-text);
        padding: 2px 6px;
        font-size: 15px;
        line-height: 1;
        opacity: 0.5;
        margin-left: 2px;
      }

      .btn-close:hover:not(:disabled) { background: var(--btn-hover); opacity: 1; }

      select {
        background: var(--btn-bg);
        color: var(--btn-text);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 3px 6px;
        font-size: 11px;
        cursor: pointer;
        outline: none;
      }

      .sep {
        width: 1px;
        height: 14px;
        background: var(--sep);
        flex-shrink: 0;
      }

      .status {
        display: none;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--btn-text);
        font-size: 11px;
        opacity: 0.85;
      }

      .hidden { display: none; }
      .status.visible { display: inline-block; }
    </style>

    <div class="bar">
      <button id="btn-free">System</button>
      <button id="btn-neural">Neutral</button>
      <button id="btn-casual">Oral</button>
      <button id="btn-auth">Sign in</button>
      <div class="sep"></div>
      <button id="btn-record">Record</button>
      <button id="btn-play" class="hidden">Play rec</button>
      <div class="sep"></div>
      <button id="btn-save" title="Saves the selected text only, not audio or recordings">Save text</button>
      <span id="status" class="status"></span>
      <div class="sep"></div>
      <select id="speed-select">
        <option value="0.75">0.75x</option>
        <option value="1" selected>1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>
      <select id="lang-select"></select>
      <button id="btn-close" class="btn-close" title="Close">&#x2715;</button>
    </div>
  `

  function $<T extends HTMLElement>(id: string): T {
    return shadow.getElementById(id) as T
  }

  const btnSystem = $<HTMLButtonElement>('btn-free')
  const btnNeural = $<HTMLButtonElement>('btn-neural')
  const btnCasual = $<HTMLButtonElement>('btn-casual')
  const btnAuth = $<HTMLButtonElement>('btn-auth')
  const btnSave = $<HTMLButtonElement>('btn-save')
  const btnRecord = $<HTMLButtonElement>('btn-record')
  const btnPlay = $<HTMLButtonElement>('btn-play')
  const btnClose = $<HTMLButtonElement>('btn-close')
  const statusEl = $<HTMLSpanElement>('status')
  const speedSelect = $<HTMLSelectElement>('speed-select')
  const langSelect = $<HTMLSelectElement>('lang-select')

  let statusTimer: number | null = null
  let activePlaybackButton: HTMLButtonElement | null = null

  btnSystem.dataset.idleLabel = 'System'
  btnSystem.dataset.idleTitle = 'Play system voice'
  btnNeural.dataset.idleLabel = 'Neutral'
  btnNeural.dataset.idleTitle = 'Play neutral neural voice'
  btnCasual.dataset.idleLabel = 'Oral'
  btnCasual.dataset.idleTitle = 'Play oral neural voice'
  btnPlay.dataset.idleLabel = 'Play rec'
  btnPlay.dataset.idleTitle = 'Play recording'
  btnSystem.dataset.stopTitle = 'Stop system voice'
  btnNeural.dataset.stopTitle = 'Stop neutral neural voice'
  btnCasual.dataset.stopTitle = 'Stop oral neural voice'
  btnPlay.dataset.stopTitle = 'Stop recording playback'

  languages.forEach((language) => {
    const option = document.createElement('option')
    option.value = language.code
    option.textContent = language.label
    langSelect.appendChild(option)
  })

  function setAITTSVisibility(visible: boolean): void {
    btnNeural.classList.toggle('hidden', !visible)
    btnCasual.classList.toggle('hidden', !visible)
    btnAuth.classList.toggle('hidden', visible)
  }

  function clearStatus(): void {
    if (statusTimer !== null) {
      window.clearTimeout(statusTimer)
      statusTimer = null
    }
    statusEl.textContent = ''
    statusEl.classList.remove('visible')
  }

  function showStatus(message: string, duration = 2400): void {
    clearStatus()
    statusEl.textContent = message
    statusEl.classList.add('visible')
    statusTimer = window.setTimeout(() => {
      statusEl.textContent = ''
      statusEl.classList.remove('visible')
      statusTimer = null
    }, duration)
  }

  function syncSaveButton(saved: boolean): void {
    btnSave.textContent = saved ? 'Delete text' : 'Save text'
    btnSave.classList.toggle('success', saved)
    btnSave.title = saved
      ? 'Deletes the saved text snippet for this selection'
      : 'Saves the selected text only, not audio or recordings'
  }

  function restorePlaybackButton(button: HTMLButtonElement): void {
    button.classList.remove('playing')
    button.innerHTML = button.dataset.idleLabel ?? button.innerHTML
    button.title = button.dataset.idleTitle ?? ''
    button.setAttribute('aria-label', button.dataset.idleTitle ?? '')
  }

  function markPlaybackButtonActive(button: HTMLButtonElement, stopLabel: string): void {
    if (activePlaybackButton) restorePlaybackButton(activePlaybackButton)
    activePlaybackButton = button
    button.classList.add('playing')
    button.innerHTML = stopLabel
    button.title = button.dataset.stopTitle ?? ''
    button.setAttribute('aria-label', button.dataset.stopTitle ?? '')
  }

  setAITTSVisibility(isSignedIn)

  return {
    host,
    btnSystem,
    btnNeural,
    btnCasual,
    btnAuth,
    btnSave,
    btnRecord,
    btnPlay,
    btnClose,
    speedSelect,
    langSelect,
    setAITTSVisibility,
    clearStatus,
    showStatus,
    syncSaveButton,
    restorePlaybackButton,
    markPlaybackButtonActive,
  }
}
