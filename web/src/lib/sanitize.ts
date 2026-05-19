import type { SnippetFilters, SnippetMutation, SnippetSortOrder } from '@/shared/types'

// eslint-disable-next-line no-control-regex -- this sanitizer intentionally strips non-printable control characters.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const MULTI_SPACE = /[ \t]+/g
const MULTI_WHITESPACE = /\s+/g
const MULTI_BLANK_LINES = /\n{3,}/g

/**
 * Removes non-printable control characters so downstream sanitizers can reason about visible content only.
 */
function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, '')
}

/**
 * Normalizes one-line text inputs such as search boxes, tag drafts, and OCR-imported snippet text.
 */
export function sanitizeInlineText(value: string): string {
  return stripControlChars(value).replace(MULTI_WHITESPACE, ' ').trim()
}

/**
 * Preserves meaningful line breaks for snippet bodies while collapsing accidental spacing noise.
 */
export function sanitizeMultilineText(value: string): string {
  return stripControlChars(value)
    .replace(/\r\n/g, '\n')
    .replace(MULTI_SPACE, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(MULTI_BLANK_LINES, '\n\n')
    .trim()
}

/**
 * Produces the canonical stored/displayed tag form so tag comparisons remain case-insensitive.
 */
export function sanitizeTagName(value: string): string {
  return sanitizeInlineText(value).toLowerCase()
}

/**
 * Deduplicates and normalizes a tag list before it is persisted or merged back into draft state.
 */
export function sanitizeTagNames(values: string[]): string[] {
  return Array.from(new Set(values.map(sanitizeTagName).filter(Boolean)))
}

/**
 * Strips control characters from language codes so URL and form state only carry clean values.
 */
export function sanitizeLanguageCode(value: string): string {
  return stripControlChars(value).trim()
}

/**
 * Restricts sort order to the supported values so malformed input always falls back to newest first.
 */
export function sanitizeSnippetSortOrder(value: string): SnippetSortOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
}

/**
 * Sanitizes a full snippet draft before repository/use-case code sends it to the backend.
 */
export function sanitizeSnippetMutation(input: SnippetMutation): SnippetMutation {
  return {
    text: sanitizeMultilineText(input.text),
    language: sanitizeLanguageCode(input.language),
    tagNames: sanitizeTagNames(input.tagNames),
  }
}

/**
 * Normalizes list filters so query keys and backend reads operate on one canonical filter shape.
 */
export function sanitizeSnippetFilters(filters: SnippetFilters = {}): SnippetFilters {
  return {
    search: filters.search ? sanitizeInlineText(filters.search) : '',
    languages: Array.from(new Set((filters.languages ?? []).map(sanitizeLanguageCode).filter(Boolean))).sort(),
    tagIds: Array.from(new Set((filters.tagIds ?? []).map((value) => value.trim()).filter(Boolean))).sort(),
    order: sanitizeSnippetSortOrder(filters.order ?? 'newest'),
  }
}
