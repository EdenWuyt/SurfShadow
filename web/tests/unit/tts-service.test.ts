import { describe, expect, it, vi } from 'vitest'
import { TTS_MAX_TEXT_LENGTH } from '@/lib/config'
import { requestTtsAudio } from '@/features/audio/api/tts-api'

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}))

describe('tts-service', () => {
  it('rejects text that exceeds the configured client limit before invoking the function', async () => {
    await expect(
      requestTtsAudio({
        text: 'x'.repeat(TTS_MAX_TEXT_LENGTH + 1),
        language: 'en-US',
        voice: 'en-US-JennyNeural',
        speed: 1,
      }),
    ).rejects.toThrow(`Text exceeds ${TTS_MAX_TEXT_LENGTH} characters`)

    expect(invokeMock).not.toHaveBeenCalled()
  })
})
