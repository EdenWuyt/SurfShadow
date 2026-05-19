import type { PracticeRecording } from '@/shared/types'
import {
  createPracticeRecordingSignedUrl,
  deletePracticeRecordingBlob,
  deletePracticeRecordingRow,
  insertPracticeRecordingRow,
  listPracticeRecordingRows,
  uploadPracticeRecordingBlob,
} from '@/features/practice/api/practice-recording-api'

/**
 * Lists saved attempts for one snippet in the exact shape the practice UI consumes.
 */
export async function listPracticeRecordingsForSnippet(snippetId: string): Promise<PracticeRecording[]> {
  return listPracticeRecordingRows(snippetId)
}

/**
 * Persists one draft recording by writing Storage first and then registering the matching database row.
 */
export async function savePracticeRecordingRecord(
  userId: string,
  snippetId: string,
  blob: Blob,
): Promise<PracticeRecording> {
  const uploaded = await uploadPracticeRecordingBlob(userId, snippetId, blob)
  return insertPracticeRecordingRow({
    userId,
    snippetId,
    storagePath: uploaded.path,
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes,
  })
}

/**
 * Resolves the short-lived playback URL used by the browser audio element.
 */
export async function getPracticeRecordingPlaybackUrl(storagePath: string): Promise<string> {
  return createPracticeRecordingSignedUrl(storagePath)
}

/**
 * Deletes both the Storage object and metadata row so saved attempts never leave orphaned files behind.
 */
export async function removePracticeRecordingRecord(recording: PracticeRecording): Promise<void> {
  await deletePracticeRecordingBlob(recording.storage_path)
  await deletePracticeRecordingRow(recording.id)
}
