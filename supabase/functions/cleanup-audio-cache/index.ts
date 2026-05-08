import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const tableName = 'audio_cache'
const bucketName = Deno.env.get('AUDIO_CACHE_BUCKET') ?? 'audio-cache'
const batchSize = Number.parseInt(Deno.env.get('AUDIO_CACHE_CLEANUP_BATCH_SIZE') ?? '100', 10) || 100
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function assertConnection() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const { error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw new Error(`Supabase connection check failed: ${error.message}`)
  }
}

async function loadExpiredRows() {
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

  const { error } = await supabase.storage.from(bucketName).remove(paths)
  if (error) throw error
}

async function deleteCacheRows(ids: string[]) {
  if (!ids.length) return

  const { error } = await supabase
    .from(tableName)
    .delete()
    .in('id', ids)

  if (error) throw error
}

Deno.serve(async () => {
  try {
    await assertConnection()

    const expiredRows = await loadExpiredRows()
    const ids = expiredRows.map((row) => row.id)
    const paths = expiredRows.map((row) => row.storage_path)

    await deleteStorageObjects(paths)
    await deleteCacheRows(ids)

    return Response.json({
      ok: true,
      connected: true,
      deleted_rows: ids.length,
      deleted_objects: paths.length,
      bucket: bucketName,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cleanup failed'
    return Response.json({ ok: false, connected: false, error: message }, { status: 500 })
  }
})
