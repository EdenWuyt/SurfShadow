import type { JSX } from 'react'
import { EditableTagChip } from '@/components/tags/EditableTagChip'
import { Button } from '@/components/ui/button'
import type { Tag } from '@/shared/types'

interface TagChoicesProps {
  onSelectAll: () => void
  onToggle: (tagId: string) => void
  selectedTagIds: string[]
  tags: Tag[]
}

export function TagChoices({ onSelectAll, onToggle, selectedTagIds, tags }: TagChoicesProps): JSX.Element {
  const allSelected = selectedTagIds.length === tags.length

  if (!tags.length) {
    return <p className="text-sm text-[color:var(--muted-foreground)]">No tags yet.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onSelectAll} size="sm" variant={allSelected ? 'default' : 'secondary'}>
        All
      </Button>
      {tags.map((tag) => (
        <EditableTagChip
          interactive
          key={tag.id}
          onClick={() => onToggle(tag.id)}
          selected={selectedTagIds.includes(tag.id)}
          tag={tag}
        />
      ))}
    </div>
  )
}
