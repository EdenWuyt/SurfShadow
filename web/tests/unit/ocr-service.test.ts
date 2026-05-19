import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OCR_MAX_IMAGE_BYTES } from '@/lib/config'
import { extractSnippetText, validateOcrImage } from '@/services/ocr-service'

const getSessionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}))

describe('ocr-service', () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('rejects unsupported image types before making a request', () => {
    const file = new File(['test'], 'ocr.txt', { type: 'text/plain' })

    expect(() => validateOcrImage(file)).toThrow('Unsupported image type')
  })

  it('rejects oversized images before making a request', () => {
    const file = new File([new Uint8Array(OCR_MAX_IMAGE_BYTES + 1)], 'ocr.png', { type: 'image/png' })

    expect(() => validateOcrImage(file)).toThrow(`Image exceeds ${OCR_MAX_IMAGE_BYTES} bytes`)
  })

  it('requires an authenticated session before calling OCR', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
    })

    await expect(
      extractSnippetText(new File(['test'], 'ocr.png', { type: 'image/png' })),
    ).rejects.toThrow('auth_required')

    expect(fetch).not.toHaveBeenCalled()
  })
})
