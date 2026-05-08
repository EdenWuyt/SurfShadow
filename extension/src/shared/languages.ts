import type { Language } from '../types'

export const LANGUAGES: Language[] = [
  { code: 'en-US', label: 'English', voice: 'en-US-JennyNeural', voiceCasual: 'en-US-AriaNeural' },
  { code: 'ja-JP', label: 'Japanese', voice: 'ja-JP-NanamiNeural', voiceCasual: 'ja-JP-ShioriNeural' },
  { code: 'zh-CN', label: 'Chinese', voice: 'zh-CN-XiaoxiaoNeural', voiceCasual: 'zh-CN-XiaoyiNeural' },
  { code: 'ko-KR', label: 'Korean', voice: 'ko-KR-SunHiNeural', voiceCasual: 'ko-KR-InJoonNeural' },
  { code: 'es-ES', label: 'Spanish', voice: 'es-ES-ElviraNeural', voiceCasual: 'es-ES-XimenaNeural' },
  { code: 'fr-FR', label: 'French', voice: 'fr-FR-DeniseNeural', voiceCasual: 'fr-FR-EloiseNeural' },
  { code: 'de-DE', label: 'German', voice: 'de-DE-KatjaNeural', voiceCasual: 'de-DE-AmalaNeural' },
]
