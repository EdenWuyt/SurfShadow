import { PRACTICE_RECORDINGS_BUCKET } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { PracticeRecording } from '@/shared/types'

export async function listPracticeRecordings(snippetId: string): Promise<PracticeRecording[]> {
  const { data, error } = await supabase
    .from('practice_recordings')
    .select('id, user_id, snippet_id, storage_path, mime_type, size_bytes, created_at')
    .eq('snippet_id', snippetId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function savePracticeRecording(
  userId: string,
  snippetId: string,
  blob: Blob,
): Promise<PracticeRecording> {
  const extension = blob.type.includes('mpeg') ? 'mp3' : 'webm'
  const path = `${userId}/${snippetId}/${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(PRACTICE_RECORDINGS_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'audio/webm',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('practice_recordings')
    .insert({
      user_id: userId,
      snippet_id: snippetId,
      storage_path: path,
      mime_type: blob.type || 'audio/webm',
      size_bytes: blob.size,
    })
    .select('id, user_id, snippet_id, storage_path, mime_type, size_bytes, created_at')
    .single()

  if (error) throw error
  return data
}

export async function getPracticeRecordingUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PRACTICE_RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, 60)

  if (error) throw error
  return data.signedUrl
}

export async function deletePracticeRecording(recording: PracticeRecording): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(PRACTICE_RECORDINGS_BUCKET)
    .remove([recording.storage_path])

  if (storageError) throw storageError

  const { error } = await supabase.from('practice_recordings').delete().eq('id', recording.id)

  if (error) throw error
}
