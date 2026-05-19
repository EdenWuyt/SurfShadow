import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { snippetQueryKeys } from '@/features/snippets/hooks/snippet-query-keys'
import { getSnippetDetail, updateSnippetRecord } from '@/features/snippets/repositories/snippet-repository'
import { listSavedTags } from '@/features/tags/repositories/tag-repository'
import type { SnippetMutation, Tag } from '@/shared/types'
import { showError, showSuccess } from '@/stores/feedback-store'

interface UseEditSnippetPageResult {
  draft: SnippetMutation | null
  isSubmitting: boolean
  loading: boolean
  onCancel: () => void
  onChange: (nextValue: SnippetMutation) => void
  onSubmit: () => Promise<void>
  queryError: unknown
  saveError: string | null
  tagsQuery: UseQueryResult<Tag[]>
}

/**
 * Owns snippet edit loading, one-time draft seeding, and update mutation lifecycle.
 */
export function useEditSnippetPage(snippetId: string): UseEditSnippetPageResult {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SnippetMutation | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const snippetQuery = useQuery({
    queryKey: snippetQueryKeys.detail(snippetId),
    queryFn: () => getSnippetDetail(snippetId),
  })

  const tagsQuery = useQuery({
    queryKey: snippetQueryKeys.tags,
    queryFn: listSavedTags,
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
    mutationFn: (nextDraft: SnippetMutation) => updateSnippetRecord(snippetId, nextDraft),
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

  /**
   * Submits the edited draft and keeps save failures local to the edit form.
   */
  async function onSubmit(): Promise<void> {
    if (!draft) return
    setSaveError(null)
    try {
      await updateMutation.mutateAsync(draft)
    } catch {
      // Mutation callbacks already translate the failure into local and global feedback.
    }
  }

  return {
    draft,
    isSubmitting: updateMutation.isPending,
    loading: snippetQuery.isLoading || tagsQuery.isLoading,
    onCancel: () => navigate('/'),
    onChange: setDraft,
    onSubmit,
    queryError: snippetQuery.error ?? tagsQuery.error,
    saveError,
    tagsQuery,
  }
}
