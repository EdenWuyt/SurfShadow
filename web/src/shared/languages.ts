import type { Language } from './types'

export const LANGUAGES: Language[] = [
  { code: 'en-US', label: 'English', voice: 'en-US-JennyNeural', voiceCasual: 'en-US-AriaNeural' },
  { code: 'ja-JP', label: 'Japanese', voice: 'ja-JP-NanamiNeural', voiceCasual: 'ja-JP-ShioriNeural' },
  { code: 'zh-CN', label: 'Chinese', voice: 'zh-CN-XiaoxiaoNeural', voiceCasual: 'zh-CN-XiaoyiNeural' },
  { code: 'ko-KR', label: 'Korean', voice: 'ko-KR-SunHiNeural', voiceCasual: 'ko-KR-InJoonNeural' },
  { code: 'es-ES', label: 'Spanish', voice: 'es-ES-ElviraNeural', voiceCasual: 'es-ES-XimenaNeural' },
  { code: 'fr-FR', label: 'French', voice: 'fr-FR-DeniseNeural', voiceCasual: 'fr-FR-EloiseNeural' },
  { code: 'de-DE', label: 'German', voice: 'de-DE-KatjaNeural', voiceCasual: 'de-DE-AmalaNeural' },
]

export function getLanguageLabel(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code
}

export function getVoiceForTone(languageCode: string, tone: 'neutral' | 'casual'): string {
  const match = LANGUAGES.find((language) => language.code === languageCode)
  if (!match) return LANGUAGES[0].voice
  return tone === 'casual' ? match.voiceCasual : match.voice
}
