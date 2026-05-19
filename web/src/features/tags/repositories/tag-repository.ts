import type { Tag } from '@/shared/types'
import { getAuthenticatedUserId } from '@/features/snippets/api/snippet-api'
import { deleteTagRow, listTagRows, updateTagRow } from '@/features/tags/api/tag-api'

/**
 * Lists all saved tags for the authenticated user.
 */
export async function listSavedTags(): Promise<Tag[]> {
  const userId = await getAuthenticatedUserId()
  return listTagRows(userId)
}

/**
 * Renames one saved tag after scoping it to the authenticated user.
 */
export async function renameSavedTag(tagId: string, name: string): Promise<Tag> {
  const userId = await getAuthenticatedUserId()
  return updateTagRow(userId, tagId, name)
}

/**
 * Deletes one saved tag after scoping it to the authenticated user.
 */
export async function removeSavedTag(tagId: string): Promise<void> {
  const userId = await getAuthenticatedUserId()
  await deleteTagRow(userId, tagId)
}
