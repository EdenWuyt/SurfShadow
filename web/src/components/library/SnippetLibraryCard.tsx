import { Ellipsis, MicVocal, Play, Square } from 'lucide-react'
import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { EditableTagChip } from '@/components/tags/EditableTagChip'
import { getLanguageLabel } from '@/shared/languages'
import type { PlaybackMode, Snippet } from '@/shared/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { reportError, resolveErrorMessage } from '@/stores/error-store'

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
      <div className="pointer-events-none absolute -bottom-10 -right-10 size-28 rounded-full bg-[radial-gradient(circle,rgba(196,91,60,0.18),transparent_65%)] md:size-40" />
      <CardContent className="space-y-3.5 p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted-foreground)] sm:text-sm">
          <span>{getLanguageLabel(snippet.language)}</span>
          <details className="relative">
            <summary className="flex list-none cursor-pointer items-center rounded-full p-1 text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)]">
              <Ellipsis className="size-4" />
            </summary>
            <div className="absolute right-0 top-8 z-10 min-w-32 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-1 shadow-[0_12px_30px_rgba(16,37,66,0.12)]">
              <Link
                className="block rounded-xl px-3 py-2 text-sm text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)]"
                to={`/snippets/${snippet.id}/edit`}
              >
                Edit
              </Link>
              <button
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[color:var(--danger)] hover:bg-[color:var(--surface-2)]"
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
          <select
            className="h-9 min-w-0 flex-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 text-sm text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            onChange={(event) => setSelectedMode(event.target.value as PlaybackMode)}
            value={selectedMode}
          >
            {playbackModes.map((mode) => (
              <option key={mode} value={mode}>
                {getModeLabel(mode)}
              </option>
            ))}
          </select>
          <Button onClick={() => void onPlay(snippet, selectedMode)} size="sm" variant={active ? 'default' : 'secondary'}>
            {active ? <Square className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
            {active ? 'Stop' : 'Play'}
          </Button>
          <Button asChild size="sm">
            <Link to={`/practice/${snippet.id}`}>
              <MicVocal className="mr-2 size-4" />
              Record
            </Link>
          </Button>
        </div>
      </CardContent>

      <Dialog onOpenChange={setConfirmDeleteOpen} open={confirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete snippet?</DialogTitle>
            <DialogDescription>
              This will remove the snippet from your library.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground)]">
              {snippet.text}
            </p>
          </div>
          {deleteError ? <p className="mt-3 text-sm text-[color:var(--danger)]">{deleteError}</p> : null}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button onClick={() => setConfirmDeleteOpen(false)} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={deleting}
              onClick={() => {
                void (async () => {
                  setDeleteError(null)
                  try {
                    await onDelete(snippet.id)
                    setConfirmDeleteOpen(false)
                  } catch (reason) {
                    const message = resolveErrorMessage(reason, 'Unable to delete snippet')
                    setDeleteError(message)
                    reportError(reason, 'Unable to delete snippet')
                  }
                })()
              }}
              size="sm"
              variant="destructive"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
