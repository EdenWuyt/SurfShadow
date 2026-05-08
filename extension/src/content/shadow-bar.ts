import type { Language, Settings } from '../types'
import { LANGUAGES } from '../shared/languages'
import { getSignedInState, sendMessage, setBarAuthSync, setContextInvalidatedHandler, syncSignedInState } from './runtime'
import { createShadowBarView, type ShadowBarView } from './shadow-bar-view'

const STOP_LABEL = '&#9632; Stop'

let barHost: HTMLDivElement | null = null
let currentAudio: HTMLAudioElement | null = null
let recordedBlob: Blob | null = null
let mediaRecorder: MediaRecorder | null = null
let audioChunks: BlobPart[] = []
let activeStream: MediaStream | null = null
let currentLang: Language = LANGUAGES[0]
let currentSpeed = 1.0

type PlaybackTone = 'neutral' | 'casual'

interface PlaybackState {
  activeButton: HTMLButtonElement | null
}

interface BarControllerState {
  snippetSaved: boolean
  playback: PlaybackState
}

interface BarControllerContext {
  selectedText: string
  state: BarControllerState
  view: ShadowBarView
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop())
    activeStream = null
  }
}

function stopPlayback(): void {
  window.speechSynthesis.cancel()
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

export function removeBar(): void {
  if (barHost) {
    barHost.remove()
    barHost = null
  }
  setBarAuthSync(null)
  setContextInvalidatedHandler(null)
  stopRecording()
  stopPlayback()
}

function voiceForTone(tone: PlaybackTone): string {
  return tone === 'casual' ? currentLang.voiceCasual : currentLang.voice
}

function playAudioBytes(bytes: number[], onEnded?: () => void): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  stopPlayback()
  currentAudio = new Audio(url)
  currentAudio.play()
  currentAudio.onended = () => {
    URL.revokeObjectURL(url)
    currentAudio = null
    onEnded?.()
  }
}

function clearActivePlaybackButton(context: BarControllerContext): void {
  const { activeButton } = context.state.playback
  if (!activeButton) return

  context.view.restorePlaybackButton(activeButton)
  context.state.playback.activeButton = null
}

function activatePlaybackButton(
  context: BarControllerContext,
  button: HTMLButtonElement,
): void {
  clearActivePlaybackButton(context)
  context.state.playback.activeButton = button
  context.view.markPlaybackButtonActive(button, STOP_LABEL)
}

function wireSettings(context: BarControllerContext): void {
  const { speedSelect, langSelect } = context.view

  context.view.syncSaveButton(context.state.snippetSaved)

  speedSelect.value = String(currentSpeed)
  speedSelect.addEventListener('change', () => {
    currentSpeed = parseFloat(speedSelect.value)
  })

  langSelect.value = currentLang.code
  langSelect.addEventListener('change', () => {
    const match = LANGUAGES.find((language) => language.code === langSelect.value)
    if (match) currentLang = match
  })

  void chrome.storage.local.get(['accessToken', 'defaultLanguage']).then((localSettings) => {
    syncSignedInState(localSettings.accessToken as string | undefined)
    const storedLang = localSettings.defaultLanguage as string | undefined
    if (storedLang) {
      const match = LANGUAGES.find((language) => language.code === storedLang)
      if (match) {
        currentLang = match
        langSelect.value = match.code
      }
    }
  })

  void sendMessage({ type: 'GET_SETTINGS' }).then((response) => {
    const settings = response as Settings | null
    syncSignedInState(settings?.accessToken)
    if (!settings?.defaultLanguage) return

    const match = LANGUAGES.find((language) => language.code === settings.defaultLanguage)
    if (!match) return

    currentLang = match
    langSelect.value = match.code
  })
}

function wireAuth(context: BarControllerContext): void {
  const { btnAuth, setAITTSVisibility, clearStatus, showStatus } = context.view

  setBarAuthSync((signedIn: boolean) => {
    setAITTSVisibility(signedIn)
  })
  setContextInvalidatedHandler(() => removeBar())

  btnAuth.addEventListener('click', async () => {
    clearStatus()
    btnAuth.disabled = true
    const previousLabel = btnAuth.textContent
    btnAuth.textContent = '...'

    const result = await sendMessage({ type: 'SIGN_IN' })

    btnAuth.disabled = false
    btnAuth.textContent = previousLabel ?? 'Sign in'

    if (result && 'success' in result) {
      setAITTSVisibility(true)
      return
    }

    if (result && 'error' in result) {
      showStatus(result.error === 'Cancelled' ? 'Sign-in cancelled.' : result.error)
      return
    }

    showStatus('Sign-in failed.')
  })
}

function wireSystemPlayback(context: BarControllerContext): void {
  const { btnSystem, clearStatus } = context.view

  btnSystem.addEventListener('click', () => {
    clearStatus()
    if (context.state.playback.activeButton === btnSystem) {
      stopPlayback()
      clearActivePlaybackButton(context)
      return
    }

    stopPlayback()
    clearActivePlaybackButton(context)

    const utterance = new SpeechSynthesisUtterance(context.selectedText)
    utterance.lang = currentLang.code
    utterance.rate = currentSpeed

    activatePlaybackButton(context, btnSystem)

    utterance.onend = () => {
      if (context.state.playback.activeButton === btnSystem) {
        clearActivePlaybackButton(context)
      }
    }
    utterance.onerror = () => {
      if (context.state.playback.activeButton === btnSystem) {
        clearActivePlaybackButton(context)
      }
    }

    window.speechSynthesis.speak(utterance)
  })
}

async function playRemoteTts(
  context: BarControllerContext,
  button: HTMLButtonElement,
  tone: PlaybackTone,
): Promise<void> {
  const { clearStatus, setAITTSVisibility, showStatus } = context.view

  clearStatus()
  if (context.state.playback.activeButton === button) {
    stopPlayback()
    clearActivePlaybackButton(context)
    return
  }

  button.disabled = true
  stopPlayback()
  clearActivePlaybackButton(context)

  const previousLabel = button.textContent
  button.textContent = '...'

  const result = await sendMessage({
    type: 'REQUEST_TTS_AUDIO',
    text: context.selectedText,
    language: currentLang.code,
    voice: voiceForTone(tone),
    speed: currentSpeed,
  })

  button.disabled = false
  button.textContent = previousLabel ?? (tone === 'casual' ? 'Oral' : 'Neutral')

  if (result && 'audio' in result) {
    activatePlaybackButton(context, button)
    playAudioBytes(result.audio, () => {
      if (context.state.playback.activeButton === button) {
        clearActivePlaybackButton(context)
      }
    })
    return
  }

  if (result && 'error' in result) {
    if (result.error === 'auth_required') {
      setAITTSVisibility(false)
      return
    }
    if (result.error === 'quota_exceeded') {
      showStatus('Monthly neural TTS quota reached.')
      return
    }
    if (result.error === 'Azure not configured') {
      showStatus('Azure Speech is not configured.')
      return
    }

    showStatus(result.error)
    return
  }

  showStatus('Unable to play neural TTS right now.')
}

function wireRemotePlayback(context: BarControllerContext): void {
  const { btnNeural, btnCasual } = context.view

  btnNeural.addEventListener('click', () => {
    void playRemoteTts(context, btnNeural, 'neutral')
  })

  btnCasual.addEventListener('click', () => {
    void playRemoteTts(context, btnCasual, 'casual')
  })
}

function wireSaveToggle(context: BarControllerContext): void {
  const { btnSave, clearStatus, showStatus, syncSaveButton } = context.view

  btnSave.addEventListener('click', async () => {
    clearStatus()
    btnSave.disabled = true
    btnSave.textContent = '...'

    const result = await sendMessage(
      context.state.snippetSaved
        ? { type: 'DELETE_SNIPPET', text: context.selectedText, language: currentLang.code }
        : { type: 'SAVE_SNIPPET', text: context.selectedText, language: currentLang.code },
    )

    if (result && 'success' in result) {
      context.state.snippetSaved = !context.state.snippetSaved
      syncSaveButton(context.state.snippetSaved)
      btnSave.disabled = false
      return
    }

    btnSave.textContent = 'Error'
    if (result && 'error' in result && result.error === 'Not signed in') {
      showStatus('Sign in from the extension popup to save text.')
    }
    setTimeout(() => {
      syncSaveButton(context.state.snippetSaved)
      btnSave.disabled = false
    }, 1500)
  })
}

function syncRecordingUI(context: BarControllerContext): void {
  const { btnRecord, btnPlay } = context.view
  const isRecording = mediaRecorder?.state === 'recording'

  btnRecord.innerHTML = isRecording ? STOP_LABEL : 'Record'
  btnRecord.classList.toggle('recording', isRecording)
  btnPlay.style.display = isRecording || !recordedBlob ? 'none' : ''
}

function wireRecording(context: BarControllerContext): void {
  const { btnRecord, btnPlay, clearStatus, showStatus } = context.view

  syncRecordingUI(context)

  btnRecord.addEventListener('click', async () => {
    clearStatus()

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      return
    }

    stopPlayback()
    clearActivePlaybackButton(context)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      btnRecord.disabled = true
      btnRecord.title = 'Enable microphone in browser settings to record'
      showStatus('Microphone access is blocked for this page.')
      return
    }

    activeStream = stream
    audioChunks = []
    recordedBlob = null

    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) audioChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType ?? 'audio/webm' })
      audioChunks = []
      stream.getTracks().forEach((track) => track.stop())
      activeStream = null
      syncRecordingUI(context)
    }

    mediaRecorder.start()
    syncRecordingUI(context)
  })

  btnPlay.addEventListener('click', () => {
    clearStatus()
    if (!recordedBlob) return

    if (context.state.playback.activeButton === btnPlay) {
      stopPlayback()
      clearActivePlaybackButton(context)
      return
    }

    const url = URL.createObjectURL(recordedBlob)
    stopPlayback()
    clearActivePlaybackButton(context)
    activatePlaybackButton(context, btnPlay)

    currentAudio = new Audio(url)
    currentAudio.play()
    currentAudio.onended = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      if (context.state.playback.activeButton === btnPlay) {
        clearActivePlaybackButton(context)
      }
    }
  })
}

function wireChromeControls(context: BarControllerContext): void {
  context.view.btnClose.addEventListener('click', () => removeBar())
}

function buildBar(selectedText: string): HTMLDivElement {
  const view = createShadowBarView(LANGUAGES, getSignedInState())
  const context: BarControllerContext = {
    selectedText,
    state: {
      snippetSaved: false,
      playback: { activeButton: null },
    },
    view,
  }

  wireSettings(context)
  wireAuth(context)
  wireSystemPlayback(context)
  wireRemotePlayback(context)
  wireSaveToggle(context)
  wireRecording(context)
  wireChromeControls(context)

  return view.host
}

export function showBar(selectedText: string): void {
  removeBar()

  const selection = window.getSelection()
  if (!selection?.rangeCount) return

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (!rect.width && !rect.height) return

  barHost = buildBar(selectedText)
  document.body.appendChild(barHost)

  requestAnimationFrame(() => {
    if (!barHost) return

    const barRect = barHost.getBoundingClientRect()
    const gap = 8
    let top = rect.bottom + gap
    let left = rect.left

    if (top + barRect.height > window.innerHeight - gap) {
      top = rect.top - barRect.height - gap
    }

    left = Math.max(gap, Math.min(left, window.innerWidth - barRect.width - gap))
    barHost.style.top = `${top}px`
    barHost.style.left = `${left}px`
  })
}

export function isBarEventTarget(target: EventTarget | null): boolean {
  return target instanceof Node && Boolean(barHost?.contains(target))
}
