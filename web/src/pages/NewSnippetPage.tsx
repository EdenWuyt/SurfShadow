import type { JSX } from 'react'
import { PageMessage } from '@/components/ui/page-message'
import { Notice } from '@/components/ui/notice'
import { SnippetForm } from '@/features/snippets/components/SnippetForm'
import { useNewSnippetPage } from '@/features/snippets/hooks/use-new-snippet-page'

export default function NewSnippetPage(): JSX.Element {
  const {
    canUseNativeCamera,
    draft,
    isExtractingOcr,
    isSubmitting,
    onCancel,
    onCaptureImage,
    onChange,
    onImageSelected,
    onSubmit,
    saveError,
    tagsQuery,
  } =
    useNewSnippetPage()

  return (
    <section className="grid gap-4">
      <SnippetForm
        availableTags={tagsQuery.data ?? []}
        canUseOcr
        canUseNativeCamera={canUseNativeCamera}
        isExtractingOcr={isExtractingOcr}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        onCaptureImage={onCaptureImage}
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
