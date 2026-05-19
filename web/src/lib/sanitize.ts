import type { SnippetFilters, SnippetMutation, SnippetSortOrder } from '@/shared/types'

// eslint-disable-next-line no-control-regex -- this sanitizer intentionally strips non-printable control characters.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const MULTI_SPACE = /[ \t]+/g
const MULTI_WHITESPACE = /\s+/g
const MULTI_BLANK_LINES = /\n{3,}/g

function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, '')
}

export function sanitizeInlineText(value: string): string {
  return stripControlChars(value).replace(MULTI_WHITESPACE, ' ').trim()
}

export function sanitizeMultilineText(value: string): string {
  return stripControlChars(value)
    .replace(/\r\n/g, '\n')
    .replace(MULTI_SPACE, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(MULTI_BLANK_LINES, '\n\n')
    .trim()
}

export function sanitizeTagName(value: string): string {
  return sanitizeInlineText(value).toLowerCase()
}

export function sanitizeTagNames(values: string[]): string[] {
  return Array.from(new Set(values.map(sanitizeTagName).filter(Boolean)))
}

export function sanitizeLanguageCode(value: string): string {
  return stripControlChars(value).trim()
}

export function sanitizeSnippetSortOrder(value: string): SnippetSortOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
}

export function sanitizeSnippetMutation(input: SnippetMutation): SnippetMutation {
  return {
    text: sanitizeMultilineText(input.text),
    language: sanitizeLanguageCode(input.language),
    tagNames: sanitizeTagNames(input.tagNames),
  }
}

export function sanitizeSnippetFilters(filters: SnippetFilters = {}): SnippetFilters {
  return {
    search: filters.search ? sanitizeInlineText(filters.search) : '',
    languages: Array.from(new Set((filters.languages ?? []).map(sanitizeLanguageCode).filter(Boolean))).sort(),
    tagIds: Array.from(new Set((filters.tagIds ?? []).map((value) => value.trim()).filter(Boolean))).sort(),
    order: sanitizeSnippetSortOrder(filters.order ?? 'newest'),
  }
}
