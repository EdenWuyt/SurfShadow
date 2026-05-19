import type { JSX } from 'react'
import { Button } from '@/components/ui/button'
import type { Tag } from '@/shared/types'
import { EditableTagChip } from '@/features/tags/components/EditableTagChip'
import { filterChoiceGroupClass } from '@/styles/recipes'

interface TagChoicesProps {
  onSelectAll: () => void
  onToggle: (tagId: string) => void
  selectedTagIds: string[]
  tags: Tag[]
}

export function TagChoices({ onSelectAll, onToggle, selectedTagIds, tags }: TagChoicesProps): JSX.Element {
  const allSelected = selectedTagIds.length === tags.length

  if (!tags.length) {
    return <p className="page-status">No tags yet.</p>
  }

  return (
    <div className={filterChoiceGroupClass}>
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
