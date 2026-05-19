import type { JSX } from 'react'
import { Button } from '@/components/ui/button'

interface LanguageChoice {
  code: string
  label: string
}

interface LanguageChoicesProps {
  languages: LanguageChoice[]
  onSelectAll: () => void
  onToggle: (code: string) => void
  selectedCodes: string[]
}

export function LanguageChoices({
  languages,
  onSelectAll,
  onToggle,
  selectedCodes,
}: LanguageChoicesProps): JSX.Element {
  const allSelected = selectedCodes.length === languages.length

  if (!languages.length) {
    return <p className="page-status">No snippet languages yet.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onSelectAll} size="sm" variant={allSelected ? 'default' : 'secondary'}>
        All
      </Button>
      {languages.map((language) => {
        const active = selectedCodes.includes(language.code)
        return (
          <Button
            key={language.code}
            onClick={() => onToggle(language.code)}
            size="sm"
            variant={active ? 'default' : 'secondary'}
          >
            {language.label}
          </Button>
        )
      })}
    </div>
  )
}
