import { useEffect, useState, type JSX } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageMessage } from '@/components/ui/page-message'
import { Notice } from '@/components/ui/notice'
import { useAuth } from '@/features/auth/AuthProvider'
import { SnippetForm } from '@/features/snippets/components/SnippetForm'
import { sanitizeInlineText } from '@/lib/sanitize'
import { LANGUAGES } from '@/shared/languages'
import type { SnippetMutation } from '@/shared/types'
import { extractSnippetText } from '@/services/ocr-service'
import { snippetQueryKeys } from '@/services/snippet-query'
import { createSnippet, listTags } from '@/services/snippet-service'
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

export default function NewSnippetPage(): JSX.Element {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SnippetMutation>(DEFAULT_DRAFT)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isExtractingOcr, setIsExtractingOcr] = useState(false)

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listTags,
  })

  useEffect(() => {
    // Profile defaults seed only the initial blank draft so user edits are never overwritten by later profile refreshes.
    const nextLanguage = resolveLanguageCode(profile?.default_language ?? null)
    setDraft((current) => {
      if (current.text || current.tagNames.length || current.language !== DEFAULT_DRAFT.language) {
        return current
      }
      if (current.language === nextLanguage) return current
      return {
        ...current,
        language: nextLanguage,
      }
    })
  }, [profile?.default_language])

  const createMutation = useMutation({
    mutationFn: createSnippet,
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

  async function handleSubmit(): Promise<void> {
    setSaveError(null)
    try {
      await createMutation.mutateAsync(draft)
    } catch {
      // Mutation-level error handling already sets the local save error.
    }
  }

  // OCR is intentionally a draft-prefill step, not an automatic save, so users can review the result first.
  async function handleImageSelected(file: File): Promise<void> {
    setIsExtractingOcr(true)
    try {
      const result = await extractSnippetText(file)
      // OCR often invents stray line breaks, so imported text is normalized as one inline phrase first.
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

  return (
    <section className="grid gap-4">
      <SnippetForm
        availableTags={tagsQuery.data ?? []}
        canUseOcr
        isExtractingOcr={isExtractingOcr}
        isSubmitting={createMutation.isPending}
        onCancel={() => navigate('/')}
        onChange={setDraft}
        onImageSelected={handleImageSelected}
        onSubmit={handleSubmit}
        submitLabel="Save snippet"
        value={draft}
      />

      {tagsQuery.error ? (
        <PageMessage variant="error">
          {tagsQuery.error instanceof Error ? tagsQuery.error.message : 'Failed to load tags'}
        </PageMessage>
      ) : null}
      {saveError ? <Notice variant="error">{saveError}</Notice> : null}
    </section>
  )
}
