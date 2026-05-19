import type { JSX } from 'react'
import { useParams } from 'react-router-dom'
import { PageMessage } from '@/components/ui/page-message'
import { useAuth } from '@/features/auth/AuthProvider'
import { AttemptPanel } from '@/features/practice/components/AttemptPanel'
import { PracticeSnippetCard } from '@/features/practice/components/PracticeSnippetCard'
import { SavedAttemptsPanel } from '@/features/practice/components/SavedAttemptsPanel'
import { SourcePlaybackPanel } from '@/features/practice/components/SourcePlaybackPanel'
import { usePracticeSession } from '@/features/practice/hooks/use-practice-session'

export default function PracticePage(): JSX.Element {
  const { snippetId = '' } = useParams()
  const { user } = useAuth()
  const {
    activeSavedRecordingId,
    deleteError,
    deletingRecordingId,
    draftRecording,
    isDraftPlaying,
    isRecording,
    isSourcePlaying,
    loading,
    micAllowed,
    onCompareLatest,
    onDeleteSaved,
    onPlayDraft,
    onPlaySaved,
    onSaveDraft,
    onToggleRecording,
    onToggleSourcePlayback,
    playbackMode,
    queryError,
    recordings,
    setPlaybackMode,
    snippet,
  } = usePracticeSession(snippetId, user?.id ?? null)

  if (loading) {
    return <PageMessage>Loading practice session...</PageMessage>
  }

  if (queryError) {
    return (
      <PageMessage variant="error">
        {queryError instanceof Error ? queryError.message : 'Failed to load practice session'}
      </PageMessage>
    )
  }

  if (!snippet) return <PageMessage variant="error">Snippet not found.</PageMessage>

  return (
    <section className="grid gap-4">
      <PracticeSnippetCard snippet={snippet} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SourcePlaybackPanel
          isPlaying={isSourcePlaying}
          mode={playbackMode}
          onModeChange={setPlaybackMode}
          onTogglePlayback={onToggleSourcePlayback}
        />
        <AttemptPanel
          canRecord={micAllowed}
          hasDraft={Boolean(draftRecording)}
          isDraftPlaying={isDraftPlaying}
          isRecording={isRecording}
          onPlayDraft={onPlayDraft}
          onSaveDraft={onSaveDraft}
          onToggleRecording={onToggleRecording}
        />
      </div>

      <SavedAttemptsPanel
        activeRecordingId={activeSavedRecordingId}
        deleteError={deleteError}
        deletingRecordingId={deletingRecordingId}
        onCompareLatest={onCompareLatest}
        onDeleteSaved={onDeleteSaved}
        onPlaySaved={onPlaySaved}
        recordings={recordings}
      />
    </section>
  )
}
