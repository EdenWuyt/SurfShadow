export interface Language {
  code: string
  label: string
  voice: string
  voiceCasual: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Snippet {
  id: string
  user_id: string
  text: string
  language: string
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface Profile {
  id: string
  default_language: string
  quota_used: number
  quota_reset_at: string | null
  created_at: string
  updated_at: string
}

export interface PracticeRecording {
  id: string
  user_id: string
  snippet_id: string
  storage_path: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export type PlaybackMode = 'system' | 'neutral' | 'oral'

export interface TtsRequest {
  text: string
  language: string
  voice: string
  speed: number
}

export interface TtsResponse {
  audio: number[]
}

export interface SnippetFilters {
  search?: string
  languages?: string[]
  tagIds?: string[]
  order?: SnippetSortOrder
}

export type SnippetSortOrder = 'newest' | 'oldest'

export interface SnippetPage {
  items: Snippet[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface SnippetMutation {
  text: string
  language: string
  tagNames: string[]
}

export interface OcrResponse {
  text: string
  detectedLanguage: string | null
}

export interface SnippetDeleteInput {
  snippetId?: string
  text?: string
  language?: string
}
