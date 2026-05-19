import { Ellipsis, MicVocal, Play, Square } from 'lucide-react'
import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { editSnippetRoutePrefetchProps, practiceRoutePrefetchProps } from '@/app/route-prefetch'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PageMessage } from '@/components/ui/page-message'
import { Select } from '@/components/ui/select'
import { EditableTagChip } from '@/features/tags/components/EditableTagChip'
import { getLanguageLabel } from '@/shared/languages'
import type { PlaybackMode, Snippet } from '@/shared/types'
import { resolveErrorMessage, showError } from '@/stores/feedback-store'
import {
  destructiveMenuItemClass,
  inlineSelectClass,
  libraryCardHeaderClass,
  libraryCardMenuTriggerClass,
  menuItemClass,
  modalPreviewClass,
} from '@/styles/recipes'

interface SnippetLibraryCardProps {
  activePlayback: { mode: PlaybackMode; snippetId: string } | null
  deleting: boolean
  onDelete: (snippetId: string) => Promise<void>
  onPlay: (snippet: Snippet, mode: PlaybackMode) => Promise<void>
  snippet: Snippet
}

const playbackModes: PlaybackMode[] = ['system', 'neutral', 'oral']

function getModeLabel(mode: PlaybackMode): string {
  switch (mode) {
    case 'system':
      return 'System'
    case 'neutral':
      return 'Neutral'
    case 'oral':
      return 'Oral'
  }
}

export function SnippetLibraryCard({
  activePlayback,
  deleting,
  onDelete,
  onPlay,
  snippet,
}: SnippetLibraryCardProps): JSX.Element {
  const [selectedMode, setSelectedMode] = useState<PlaybackMode>('neutral')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const active = activePlayback?.snippetId === snippet.id && activePlayback.mode === selectedMode

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -bottom-10 -right-10 size-28 rounded-full bg-[radial-gradient(circle,var(--landing-gradient-radial),transparent_65%)] md:size-40" />
      <CardContent className="space-y-3.5 p-4">
        <div className={libraryCardHeaderClass}>
          <span>{getLanguageLabel(snippet.language)}</span>
          <details className="relative">
            <summary className={libraryCardMenuTriggerClass}>
              <Ellipsis className="size-4" />
            </summary>
            <div className="surface-menu absolute right-0 top-8 z-10 min-w-32 p-1">
              <Link className={menuItemClass} to={`/snippets/${snippet.id}/edit`} {...editSnippetRoutePrefetchProps}>
                Edit
              </Link>
              <button
                className={destructiveMenuItemClass}
                disabled={deleting}
                onClick={() => {
                  setDeleteError(null)
                  setConfirmDeleteOpen(true)
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </details>
        </div>

        <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground)] sm:text-base sm:leading-7">
          {snippet.text}
        </p>

        {snippet.tags.length ? (
          <div className="flex flex-wrap gap-2">
            {snippet.tags.map((tag) => (
              <EditableTagChip key={tag.id} tag={tag} />
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Select
            className={inlineSelectClass}
            onChange={(event) => setSelectedMode(event.target.value as PlaybackMode)}
            value={selectedMode}
          >
            {playbackModes.map((mode) => (
              <option key={mode} value={mode}>
                {getModeLabel(mode)}
              </option>
            ))}
          </Select>
          <Button onClick={() => void onPlay(snippet, selectedMode)} size="sm" variant={active ? 'default' : 'secondary'}>
            {active ? <Square className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
            {active ? 'Stop' : 'Play'}
          </Button>
          <Button asChild size="sm">
            <Link to={`/practice/${snippet.id}`} {...practiceRoutePrefetchProps}>
              <MicVocal className="mr-2 size-4" />
              Record
            </Link>
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        description="This will remove the snippet from your library."
        errorMessage={deleteError}
        isPending={deleting}
        onConfirm={async () => {
          setDeleteError(null)
          try {
            await onDelete(snippet.id)
            setConfirmDeleteOpen(false)
          } catch (reason) {
            const message = resolveErrorMessage(reason, 'Unable to delete snippet')
            setDeleteError(message)
            showError(reason, 'Unable to delete snippet')
          }
        }}
        onOpenChange={setConfirmDeleteOpen}
        open={confirmDeleteOpen}
        title="Delete snippet?"
      >
        <div className={modalPreviewClass}>
          <PageMessage className="whitespace-pre-wrap leading-6 text-[color:var(--foreground)]">
            {snippet.text}
          </PageMessage>
        </div>
      </ConfirmDialog>
    </Card>
  )
}
