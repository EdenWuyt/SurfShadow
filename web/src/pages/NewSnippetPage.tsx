import type { JSX } from 'react'
import { PageMessage } from '@/components/ui/page-message'
import { Notice } from '@/components/ui/notice'
import { SnippetForm } from '@/features/snippets/components/SnippetForm'
import { useNewSnippetPage } from '@/features/snippets/hooks/use-new-snippet-page'

export default function NewSnippetPage(): JSX.Element {
  const { draft, isExtractingOcr, isSubmitting, onCancel, onChange, onImageSelected, onSubmit, saveError, tagsQuery } =
    useNewSnippetPage()

  return (
    <section className="grid gap-4">
      <SnippetForm
        availableTags={tagsQuery.data ?? []}
        canUseOcr
        isExtractingOcr={isExtractingOcr}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        onChange={onChange}
        onImageSelected={onImageSelected}
        onSubmit={onSubmit}
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
