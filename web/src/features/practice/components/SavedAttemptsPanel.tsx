import { ArrowRightLeft, Trash2, Volume2 } from 'lucide-react'
import { useState, type JSX } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PageMessage } from '@/components/ui/page-message'
import type { PracticeRecording } from '@/shared/types'

interface SavedAttemptsPanelProps {
  activeRecordingId: string | null
  deleteError: string | null
  deletingRecordingId: string | null
  onCompareLatest: () => Promise<void>
  onDeleteSaved: (recording: PracticeRecording) => Promise<void>
  onPlaySaved: (recording: PracticeRecording) => Promise<void>
  recordings: PracticeRecording[]
}

export function SavedAttemptsPanel({
  activeRecordingId,
  deleteError,
  deletingRecordingId,
  onCompareLatest,
  onDeleteSaved,
  onPlaySaved,
  recordings,
}: SavedAttemptsPanelProps): JSX.Element {
  const [confirmRecording, setConfirmRecording] = useState<PracticeRecording | null>(null)

  /**
   * Closes the confirm dialog only after a successful delete so failures remain visible in-context.
   */
  async function handleConfirmDelete(): Promise<void> {
    if (!confirmRecording) return
    await onDeleteSaved(confirmRecording)
    setConfirmRecording(null)
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-xl text-[color:var(--foreground)]">Saved attempts</h2>
            <Button disabled={!recordings.length} onClick={() => void onCompareLatest()} size="sm" variant="outline">
              <ArrowRightLeft className="mr-2 size-4" />
              Compare latest
            </Button>
          </div>

          {recordings.length ? (
            <div className="space-y-3">
              {recordings.map((recording) => {
                const isPlaying = activeRecordingId === recording.id
                const isDeleting = deletingRecordingId === recording.id

                return (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                    key={recording.id}
                  >
                    <div>
                      <p className="font-medium text-[color:var(--foreground)]">
                        Attempt from {new Date(recording.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {Math.round(recording.size_bytes / 1024)} KB saved
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => void onPlaySaved(recording)} size="sm" variant="outline">
                        <Volume2 className="mr-2 size-4" />
                        {isPlaying ? 'Stop' : 'Play'}
                      </Button>
                      <Button
                        disabled={isDeleting}
                        onClick={() => setConfirmRecording(recording)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted-foreground)]">No saved attempts yet.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        description="This removes the saved recording from your practice history."
        errorMessage={deleteError}
        isPending={Boolean(deletingRecordingId)}
        onConfirm={handleConfirmDelete}
        onOpenChange={(open) => !open && !deletingRecordingId && setConfirmRecording(null)}
        open={Boolean(confirmRecording)}
        title="Delete saved attempt?"
      >
        {confirmRecording ? (
          <div className="surface-preview px-3 py-2">
            <PageMessage className="text-[color:var(--foreground)]">
              Attempt from {new Date(confirmRecording.created_at).toLocaleString()}
            </PageMessage>
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  )
}
