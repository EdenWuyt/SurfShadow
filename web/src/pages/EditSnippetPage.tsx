import type { JSX } from 'react'
import { useParams } from 'react-router-dom'
import { Notice } from '@/components/ui/notice'
import { PageMessage } from '@/components/ui/page-message'
import { SnippetForm } from '@/features/snippets/components/SnippetForm'
import { useEditSnippetPage } from '@/features/snippets/hooks/use-edit-snippet-page'

export default function EditSnippetPage(): JSX.Element {
  const { snippetId = '' } = useParams()
  const { draft, isSubmitting, loading, onCancel, onChange, onSubmit, queryError, saveError, tagsQuery } =
    useEditSnippetPage(snippetId)

  if (loading) {
    return <PageMessage>Loading snippet...</PageMessage>
  }

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
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        onChange={onChange}
        onSubmit={onSubmit}
        submitLabel="Save changes"
        value={draft}
      />

      {saveError ? <Notice variant="error">{saveError}</Notice> : null}
    </section>
  )
}
