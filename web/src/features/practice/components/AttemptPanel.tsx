import { Mic, Save, Square, Volume2 } from 'lucide-react'
import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AttemptPanelProps {
  canRecord: boolean
  hasDraft: boolean
  isDraftPlaying: boolean
  isRecording: boolean
  onPlayDraft: () => Promise<void>
  onSaveDraft: () => Promise<void>
  onToggleRecording: () => Promise<void> | void
}

export function AttemptPanel({
  canRecord,
  hasDraft,
  isDraftPlaying,
  isRecording,
  onPlayDraft,
  onSaveDraft,
  onToggleRecording,
}: AttemptPanelProps): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-[color:var(--foreground)]">Your attempt</h2>
          {!canRecord ? <Badge variant="muted">Listen-only</Badge> : null}
        </div>

        <Button className="w-full" onClick={() => void onToggleRecording()}>
          {isRecording ? <Square className="mr-2 size-4" /> : <Mic className="mr-2 size-4" />}
          {isRecording ? 'Stop recording' : 'Record'}
        </Button>

        {hasDraft ? (
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" onClick={() => void onPlayDraft()} variant="outline">
              {isDraftPlaying ? <Square className="mr-2 size-4" /> : <Volume2 className="mr-2 size-4" />}
              {isDraftPlaying ? 'Stop' : 'Play draft'}
            </Button>
            <Button className="w-full" onClick={() => void onSaveDraft()}>
              <Save className="mr-2 size-4" />
              Save attempt
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
