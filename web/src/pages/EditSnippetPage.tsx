import { useEffect, useState, type JSX } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { SnippetForm } from '@/components/SnippetForm'
import type { SnippetMutation } from '@/shared/types'
import { snippetQueryKeys } from '@/services/snippet-query'
import { getSnippet, listTags, updateSnippet } from '@/services/snippet-service'
import { reportError, reportSuccess } from '@/stores/error-store'

export default function EditSnippetPage(): JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { snippetId = '' } = useParams()
  const [draft, setDraft] = useState<SnippetMutation | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const snippetQuery = useQuery({
    queryKey: snippetQueryKeys.detail(snippetId),
    queryFn: () => getSnippet(snippetId),
  })

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listTags,
  })

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
      reportSuccess('Snippet updated.')
      navigate('/')
    },
    onError: (reason: unknown) => {
      setStatus(reportError(reason, 'Unable to update snippet'))
    },
  })

  async function handleSubmit(): Promise<void> {
    if (!draft) return
    setStatus('Saving changes...')
    try {
      await updateMutation.mutateAsync(draft)
    } catch {}
  }

  if (snippetQuery.isLoading || tagsQuery.isLoading) {
    return <p className="text-sm text-[color:var(--muted-foreground)]">Loading snippet...</p>
  }

  const queryError = snippetQuery.error ?? tagsQuery.error
  if (queryError) {
    return (
      <p className="text-sm text-[color:var(--danger)]">
        {queryError instanceof Error ? queryError.message : 'Failed to load snippet'}
      </p>
    )
  }

  if (!draft) return <p className="text-sm text-[color:var(--danger)]">Snippet not found.</p>

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

      {status ? (
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--foreground)]">
          {status}
        </div>
      ) : null}
    </section>
  )
}
