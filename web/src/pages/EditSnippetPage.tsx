import { useEffect, useState, type JSX } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Notice } from '@/components/ui/notice'
import { PageMessage } from '@/components/ui/page-message'
import { SnippetForm } from '@/features/snippets/components/SnippetForm'
import type { SnippetMutation } from '@/shared/types'
import { snippetQueryKeys } from '@/services/snippet-query'
import { getSnippet, listTags, updateSnippet } from '@/services/snippet-service'
import { showError, showSuccess } from '@/stores/feedback-store'

export default function EditSnippetPage(): JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { snippetId = '' } = useParams()
  const [draft, setDraft] = useState<SnippetMutation | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const snippetQuery = useQuery({
    queryKey: snippetQueryKeys.detail(snippetId),
    queryFn: () => getSnippet(snippetId),
  })

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listTags,
  })

  // The edit form only seeds once from the fetched snippet so local edits are not blown away by a refetch.
  useEffect(() => {
    if (!snippetQuery.data || draft) return
    setDraft({
      text: snippetQuery.data.text,
      language: snippetQuery.data.language,
      tagNames: snippetQuery.data.tags.map((tag) => tag.name),
    })
  }, [draft, snippetQuery.data])

  const updateMutation = useMutation({
    mutationFn: (nextDraft: SnippetMutation) => updateSnippet(snippetId, nextDraft),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: snippetQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: snippetQueryKeys.detail(snippetId) }),
        queryClient.invalidateQueries({ queryKey: snippetQueryKeys.tags }),
      ])
      showSuccess('Snippet updated.')
      navigate('/')
    },
    onError: (reason: unknown) => {
      setSaveError(showError(reason, 'Unable to update snippet'))
    },
  })

  async function handleSubmit(): Promise<void> {
    if (!draft) return
    setSaveError(null)
    try {
      await updateMutation.mutateAsync(draft)
    } catch {
      // Mutation-level error handling already sets the local save error.
    }
  }

  if (snippetQuery.isLoading || tagsQuery.isLoading) {
    return <PageMessage>Loading snippet...</PageMessage>
  }

  const queryError = snippetQuery.error ?? tagsQuery.error
  if (queryError) {
    return (
      <PageMessage variant="error">
        {queryError instanceof Error ? queryError.message : 'Failed to load snippet'}
      </PageMessage>
    )
  }

  if (!draft) return <PageMessage variant="error">Snippet not found.</PageMessage>

  return (
    <section className="grid gap-4">
      <SnippetForm
        availableTags={tagsQuery.data ?? []}
        isSubmitting={updateMutation.isPending}
        onCancel={() => navigate('/')}
        onChange={setDraft}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        value={draft}
      />

      {saveError ? <Notice variant="error">{saveError}</Notice> : null}
    </section>
  )
}
