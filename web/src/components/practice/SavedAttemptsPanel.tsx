import { ArrowRightLeft, Trash2, Volume2 } from 'lucide-react'
import { useState, type JSX } from 'react'
import type { PracticeRecording } from '@/shared/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[color:var(--border)] bg-white/50 px-4 py-3"
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

      <Dialog onOpenChange={(open) => !open && !deletingRecordingId && setConfirmRecording(null)} open={Boolean(confirmRecording)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete saved attempt?</DialogTitle>
            <DialogDescription>This removes the saved recording from your practice history.</DialogDescription>
          </DialogHeader>
          {confirmRecording ? (
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)]">
              Attempt from {new Date(confirmRecording.created_at).toLocaleString()}
            </div>
          ) : null}
          {deleteError ? (
            <div className="rounded-[18px] border border-[color:var(--danger)]/20 bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--danger)]">
              {deleteError}
            </div>
          ) : null}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              disabled={Boolean(deletingRecordingId)}
              onClick={() => setConfirmRecording(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button className="flex-1" disabled={Boolean(deletingRecordingId)} onClick={() => void handleConfirmDelete()}>
              {deletingRecordingId ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
