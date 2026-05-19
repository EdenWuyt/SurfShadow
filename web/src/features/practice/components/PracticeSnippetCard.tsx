import type { JSX } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { EditableTagChip } from '@/features/tags/components/EditableTagChip'
import { getLanguageLabel } from '@/shared/languages'
import type { Snippet } from '@/shared/types'

interface PracticeSnippetCardProps {
  snippet: Snippet
}

export function PracticeSnippetCard({ snippet }: PracticeSnippetCardProps): JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
            Practice
          </span>
          <span className="text-[color:var(--muted-foreground)]">
            {getLanguageLabel(snippet.language)}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-base leading-7 text-[color:var(--foreground)] sm:text-lg sm:leading-8">
          {snippet.text}
        </p>
        {snippet.tags.length ? (
          <div className="flex flex-wrap gap-2">
            {snippet.tags.map((tag) => (
              <EditableTagChip key={tag.id} tag={tag} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
