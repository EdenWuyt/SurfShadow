import { useEffect, useState, type JSX } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SnippetForm } from '@/components/SnippetForm'
import { useAuth } from '@/features/auth/AuthProvider'
import { LANGUAGES } from '@/shared/languages'
import type { SnippetMutation } from '@/shared/types'
import { extractSnippetText } from '@/services/ocr-service'
import { snippetQueryKeys } from '@/services/snippet-query'
import { createSnippet, listTags } from '@/services/snippet-service'
import { reportError, reportSuccess } from '@/stores/error-store'

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
  const [status, setStatus] = useState<string | null>(null)
  const [isExtractingOcr, setIsExtractingOcr] = useState(false)

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listTags,
  })

  useEffect(() => {
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
      reportSuccess('Snippet saved.')
      navigate('/')
    },
    onError: (reason: unknown) => {
      setStatus(reportError(reason, 'Unable to save snippet'))
    },
  })

  async function handleSubmit(): Promise<void> {
    setStatus('Saving snippet...')
    try {
      await createMutation.mutateAsync(draft)
    } catch {}
  }

  async function handleImageSelected(file: File): Promise<void> {
    setIsExtractingOcr(true)
    setStatus('Extracting text from image...')
    try {
      const result = await extractSnippetText(file)
      setDraft((current) => ({
        ...current,
        text: result.text,
        language: resolveLanguageCode(result.detectedLanguage),
      }))
      setStatus(reportSuccess('OCR text imported. Review and save when ready.'))
    } catch (reason) {
      setStatus(reportError(reason, 'Unable to extract text'))
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
        <p className="text-sm text-[color:var(--danger)]">
          {tagsQuery.error instanceof Error ? tagsQuery.error.message : 'Failed to load tags'}
        </p>
      ) : null}
      {status ? (
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)]">
          {status}
        </div>
      ) : null}
    </section>
  )
}
