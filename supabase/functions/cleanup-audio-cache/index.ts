import { assertSupabaseServerEnv, corsPreflight, getServiceClient, json } from '../_shared/runtime.ts'

const tableName = 'audio_cache'
const bucketName = Deno.env.get('AUDIO_CACHE_BUCKET') ?? 'audio-cache'
const batchSize = Number.parseInt(Deno.env.get('AUDIO_CACHE_CLEANUP_BATCH_SIZE') ?? '100', 10) || 100

async function assertConnection() {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw new Error(`Supabase connection check failed: ${error.message}`)
  }
}

async function loadExpiredRows() {
  const supabase = getServiceClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(tableName)
    .select('id, storage_path')
    .lte('expires_at', now)
    .limit(batchSize)

  if (error) throw error
  return data ?? []
}

async function deleteStorageObjects(paths: string[]) {
  if (!paths.length) return

  const supabase = getServiceClient()
  const { error } = await supabase.storage.from(bucketName).remove(paths)
  if (error) throw error
}

async function deleteCacheRows(ids: string[]) {
  if (!ids.length) return

  const supabase = getServiceClient()
  const { error } = await supabase
    .from(tableName)
    .delete()
    .in('id', ids)

  if (error) throw error
}

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    assertSupabaseServerEnv()
    await assertConnection()

    const expiredRows = await loadExpiredRows()
    const ids = expiredRows.map((row) => row.id)
    const paths = expiredRows.map((row) => row.storage_path)

    await deleteStorageObjects(paths)
    await deleteCacheRows(ids)

    return json({
      ok: true,
      connected: true,
      deleted_rows: ids.length,
      deleted_objects: paths.length,
      bucket: bucketName,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cleanup failed'
    return json({ ok: false, connected: false, error: message }, 500)
  }
})
