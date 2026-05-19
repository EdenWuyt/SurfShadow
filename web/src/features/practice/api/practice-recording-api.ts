import { PRACTICE_RECORDINGS_BUCKET } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { PracticeRecording } from '@/shared/types'

/**
 * Loads saved practice recording rows for one snippet in newest-first order.
 */
export async function listPracticeRecordingRows(snippetId: string): Promise<PracticeRecording[]> {
  const { data, error } = await supabase
    .from('practice_recordings')
    .select('id, user_id, snippet_id, storage_path, mime_type, size_bytes, created_at')
    .eq('snippet_id', snippetId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Uploads the raw recording blob into Storage before any database row is created.
 */
export async function uploadPracticeRecordingBlob(
  userId: string,
  snippetId: string,
  blob: Blob,
): Promise<{ mimeType: string; path: string; sizeBytes: number }> {
  const mimeType = blob.type || 'audio/webm'
  const extension = blob.type.includes('mpeg') ? 'mp3' : 'webm'
  const path = `${userId}/${snippetId}/${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from(PRACTICE_RECORDINGS_BUCKET)
    .upload(path, blob, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw error
  return { mimeType, path, sizeBytes: blob.size }
}

/**
 * Inserts the practice recording row after Storage upload has succeeded.
 */
export async function insertPracticeRecordingRow(input: {
  userId: string
  snippetId: string
  storagePath: string
  mimeType: string
  sizeBytes: number
}): Promise<PracticeRecording> {
  const { data, error } = await supabase
    .from('practice_recordings')
    .insert({
      user_id: input.userId,
      snippet_id: input.snippetId,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select('id, user_id, snippet_id, storage_path, mime_type, size_bytes, created_at')
    .single()

  if (error) throw error
  return data
}

/**
 * Creates a short-lived signed URL for browser playback of one saved attempt.
 */
export async function createPracticeRecordingSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PRACTICE_RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, 60)

  if (error) throw error
  return data.signedUrl
}

/**
 * Removes the underlying Storage object before the metadata row is deleted.
 */
export async function deletePracticeRecordingBlob(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(PRACTICE_RECORDINGS_BUCKET)
    .remove([storagePath])

  if (error) throw error
}

/**
 * Deletes the saved practice recording row after its Storage object is gone.
 */
export async function deletePracticeRecordingRow(recordingId: string): Promise<void> {
  const { error } = await supabase.from('practice_recordings').delete().eq('id', recordingId)
  if (error) throw error
}
