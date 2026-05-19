import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { createSnippetRecord } from '@/features/snippets/repositories/snippet-repository'
import { listSavedTags } from '@/features/tags/repositories/tag-repository'
import { sanitizeInlineText } from '@/lib/sanitize'
import { LANGUAGES } from '@/shared/languages'
import type { SnippetMutation, Tag } from '@/shared/types'
import { extractSnippetText } from '@/features/snippets/api/ocr-api'
import { showError, showSuccess } from '@/stores/feedback-store'

const DEFAULT_DRAFT: SnippetMutation = {
  text: '',
  language: LANGUAGES[0]?.code ?? 'en-US',
  tagNames: [],
}

function resolveLanguageCode(languageCode: string | null): string {
  if (!languageCode) return DEFAULT_DRAFT.language
  return LANGUAGES.some((language) => language.code === languageCode) ? languageCode : DEFAULT_DRAFT.language
}

interface UseNewSnippetPageResult {
  draft: SnippetMutation
  isExtractingOcr: boolean
  isSubmitting: boolean
  onCancel: () => void
  onChange: (nextValue: SnippetMutation) => void
  onImageSelected: (file: File) => Promise<void>
  onSubmit: () => Promise<void>
  saveError: string | null
  tagsQuery: UseQueryResult<Tag[]>
}

/**
 * Owns the new-snippet draft, profile default seeding, OCR prefill, and create mutation lifecycle.
 */
export function useNewSnippetPage(): UseNewSnippetPageResult {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SnippetMutation>(DEFAULT_DRAFT)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isExtractingOcr, setIsExtractingOcr] = useState(false)

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listSavedTags,
  })

  useEffect(() => {
    const nextLanguage = resolveLanguageCode(profile?.default_language ?? null)
    setDraft((current) => {
      if (current.text || current.tagNames.length || current.language !== DEFAULT_DRAFT.language) {
        return current
      }
      if (current.language === nextLanguage) return current
      return { ...current, language: nextLanguage }
    })
  }, [profile?.default_language])

  const createMutation = useMutation({
    mutationFn: createSnippetRecord,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: snippetQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: snippetQueryKeys.tags }),
      ])
      showSuccess('Snippet saved.')
      navigate('/')
    },
    onError: (reason: unknown) => {
      setSaveError(showError(reason, 'Unable to save snippet'))
    },
  })

  /**
   * Submits the current draft and leaves save failures inline near the form.
   */
  async function onSubmit(): Promise<void> {
    setSaveError(null)
    try {
      await createMutation.mutateAsync(draft)
    } catch {
      // Mutation callbacks already translate the failure into local and global feedback.
    }
  }

  /**
   * Imports OCR text as a draft prefill, flattening stray OCR line breaks before the user edits the snippet.
   */
  async function onImageSelected(file: File): Promise<void> {
    setIsExtractingOcr(true)
    try {
      const result = await extractSnippetText(file)
      setDraft((current) => ({
        ...current,
        text: sanitizeInlineText(result.text),
        language: resolveLanguageCode(result.detectedLanguage),
      }))
      showSuccess('OCR text imported. Review and save when ready.')
    } catch (reason) {
      showError(reason, 'Unable to extract text')
    } finally {
      setIsExtractingOcr(false)
    }
  }

  return {
    draft,
    isExtractingOcr,
    isSubmitting: createMutation.isPending,
    onCancel: () => navigate('/'),
    onChange: setDraft,
    onImageSelected,
    onSubmit,
    saveError,
    tagsQuery,
  }
}
