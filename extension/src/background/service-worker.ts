// Routes extension runtime messages to the background auth, snippet, and TTS handlers.
import type { Message, MessageResponse } from '../types'
import { signIn } from './auth'
import { saveProfileDefaults } from './profile'
import { getSettings } from './settings'
import { checkSnippetSaved, deleteSnippet, saveSnippet } from './snippets'
import { getAudio } from './tts'

async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case 'REQUEST_TTS_AUDIO':
      return getAudio(message.text, message.language, message.voice, message.speed)
    case 'SAVE_SNIPPET':
      return saveSnippet(message.text, message.language)
    case 'DELETE_SNIPPET':
      return deleteSnippet(message.text, message.language)
    case 'CHECK_SNIPPET':
      return checkSnippetSaved(message.text, message.language)
    case 'SIGN_IN':
      return signIn()
    case 'GET_SETTINGS':
      return getSettings()
    case 'SAVE_SETTINGS': {
      const settings = await getSettings()
      await saveProfileDefaults(
        settings,
        message.defaultLanguage,
      )
      return { success: true }
    }
    case 'SIGN_OUT':
      await chrome.storage.local.remove(['accessToken', 'refreshToken'])
      return { success: true }
    default:
      return { error: 'Unknown message type' }
  }
}

chrome.runtime.onMessage.addListener(
  (rawMessage: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) => {
    handleMessage(rawMessage as Message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unexpected background error'
        sendResponse({ error: message })
      })
    return true
  },
)
