import { Play, Square } from 'lucide-react'
import type { JSX } from 'react'
import type { PlaybackMode } from '@/shared/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SourcePlaybackPanelProps {
  isPlaying: boolean
  mode: PlaybackMode
  onModeChange: (mode: PlaybackMode) => void
  onTogglePlayback: () => Promise<void>
}

const modes: PlaybackMode[] = ['system', 'neutral', 'oral']

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

export function SourcePlaybackPanel({
  isPlaying,
  mode,
  onModeChange,
  onTogglePlayback,
}: SourcePlaybackPanelProps): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="font-serif text-xl text-[color:var(--foreground)]">Source playback</h2>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((value) => (
            <Button
              key={value}
              onClick={() => onModeChange(value)}
              size="sm"
              variant={mode === value ? 'default' : 'secondary'}
            >
              {getModeLabel(value)}
            </Button>
          ))}
        </div>
        <Button className="w-full" onClick={() => void onTogglePlayback()} size="sm">
          {isPlaying ? <Square className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
          {isPlaying ? 'Stop' : 'Play'}
        </Button>
      </CardContent>
    </Card>
  )
}
