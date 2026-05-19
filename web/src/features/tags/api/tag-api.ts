import { supabase } from '@/lib/supabase'
import type { Tag } from '@/shared/types'

/**
 * Lists all saved tags for one user in name order.
 */
export async function listTagRows(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, user_id, name, created_at, updated_at')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Loads tag rows by id for snippet attachment and tag-filter resolution.
 */
export async function listTagsByIds(tagIds: string[]): Promise<Tag[]> {
  if (!tagIds.length) return []

  const { data, error } = await supabase
    .from('tags')
    .select('id, user_id, name, created_at, updated_at')
    .in('id', tagIds)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Updates one saved tag name for the current user.
 */
export async function updateTagRow(userId: string, tagId: string, name: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .update({ name })
    .eq('id', tagId)
    .eq('user_id', userId)
    .select('id, user_id, name, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

/**
 * Deletes one saved tag for the current user.
 */
export async function deleteTagRow(userId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('user_id', userId)

  if (error) throw error
}
