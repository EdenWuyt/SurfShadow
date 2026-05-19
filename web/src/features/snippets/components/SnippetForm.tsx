import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
} from 'react'
import { ImagePlus, ScanLine } from 'lucide-react'
import { EditableTagChip } from '@/components/tags/EditableTagChip'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { OCR_ACCEPT_ATTRIBUTE } from '@/lib/config'
import {
  sanitizeInlineText,
  sanitizeLanguageCode,
  sanitizeMultilineText,
  sanitizeTagName,
  sanitizeTagNames,
} from '@/lib/sanitize'
import { LANGUAGES } from '@/shared/languages'
import type { SnippetMutation, Tag } from '@/shared/types'
import {
  chipSelectedClass,
  fieldLabelClass,
  helperTextClass,
} from '@/styles/recipes'

interface SnippetFormProps {
  availableTags: Tag[]
  canUseOcr?: boolean
  isExtractingOcr?: boolean
  isSubmitting?: boolean
  onCancel?: () => void
  onImageSelected?: (file: File) => Promise<void>
  onSubmit: () => Promise<void>
  submitLabel: string
  value: SnippetMutation
  onChange: (nextValue: SnippetMutation) => void
}

export function SnippetForm({
  availableTags,
  canUseOcr = false,
  isExtractingOcr = false,
  isSubmitting = false,
  onCancel,
  onImageSelected,
  onSubmit,
  submitLabel,
  value,
  onChange,
}: SnippetFormProps): JSX.Element {
  const [tagDraft, setTagDraft] = useState('')
  const uploadInputId = useId()
  const cameraInputId = useId()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const tagOptions = useMemo(
    () => availableTags.slice().sort((left, right) => left.name.localeCompare(right.name)),
    [availableTags],
  )

  // Keeping draft updates centralized avoids each field reimplementing object merge logic.
  function updateDraft(nextPatch: Partial<SnippetMutation>): void {
    onChange({
      ...value,
      ...nextPatch,
    })
  }

  // Tag creation and toggle both route through the same sanitizer so UI and server shape stay aligned.
  function addTag(rawTagName: string): void {
    const nextTagNames = sanitizeTagNames([...value.tagNames, rawTagName])
    updateDraft({ tagNames: nextTagNames })
    setTagDraft('')
  }

  function removeTag(tagName: string): void {
    updateDraft({
      tagNames: value.tagNames.filter((existingTagName) => existingTagName !== tagName),
    })
  }

  function toggleTag(tagName: string): void {
    if (value.tagNames.includes(tagName)) {
      removeTag(tagName)
      return
    }

    addTag(tagName)
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    if (sanitizeTagName(tagDraft)) addTag(tagDraft)
  }

  // OCR uses hidden inputs so the main form layout stays stable while still supporting camera capture.
  async function handleImageChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onImageSelected) return
    await onImageSelected(file)
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit()
      }}
    >
      {canUseOcr ? (
        <>
          <input
            accept={OCR_ACCEPT_ATTRIBUTE}
            className="sr-only"
            id={uploadInputId}
            onChange={(event) => {
              void handleImageChange(event)
            }}
            ref={uploadInputRef}
            type="file"
          />
          <input
            accept={OCR_ACCEPT_ATTRIBUTE}
            capture="environment"
            className="sr-only"
            id={cameraInputId}
            onChange={(event) => {
              void handleImageChange(event)
            }}
            ref={cameraInputRef}
            type="file"
          />
        </>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4">
          <label className={fieldLabelClass} htmlFor="snippet-text">
            Snippet text
          </label>
          <Textarea
            id="snippet-text"
            className='mt-2'
            onChange={(event) => updateDraft({ text: sanitizeMultilineText(event.target.value) })}
            placeholder="Paste or type the line you want to shadow."
            required
            rows={7}
            value={value.text}
          />
          {canUseOcr ? (
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={isExtractingOcr}
                onClick={() => cameraInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <ScanLine className="mr-2 size-4" />
                {isExtractingOcr ? 'Reading image' : 'Take image'}
              </Button>
              <Button
                disabled={isExtractingOcr}
                onClick={() => uploadInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <ImagePlus className="mr-2 size-4" />
                Upload
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2.5">
            <label className={fieldLabelClass} htmlFor="snippet-language">
              Language
            </label>
            <Select
              className="h-12 w-full rounded-2xl px-4 mt-2"
              id="snippet-language"
              onChange={(event) => updateDraft({ language: sanitizeLanguageCode(event.target.value) })}
              value={value.language}
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            <label className={fieldLabelClass} htmlFor="snippet-tags">
              Tags
            </label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                className="flex-1"
                id="snippet-tags"
                onChange={(event) => setTagDraft(sanitizeInlineText(event.target.value))}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag"
                value={tagDraft}
              />
              <Button
                disabled={!sanitizeTagName(tagDraft)}
                onClick={() => addTag(tagDraft)}
                type="button"
                variant="secondary"
              >
                Add tag
              </Button>
            </div>
            {value.tagNames.length ? (
              <div className="flex flex-wrap gap-2">
                {value.tagNames.map((tagName) => (
                  <button
                    className={`${chipSelectedClass} relative pr-6`}
                    key={tagName}
                    onClick={() => removeTag(tagName)}
                    type="button"
                  >
                    <span>#{tagName}</span>
                    <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--accent-foreground)]/18 text-[10px] font-semibold leading-none text-[color:var(--accent-foreground)]">
                      x
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className={helperTextClass}>No tags yet.</p>
            )}
            <p className={fieldLabelClass}>Saved tags</p>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <EditableTagChip
                  interactive
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  selected={value.tagNames.includes(tag.name)}
                  tag={tag}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pb-2">
        {onCancel ? (
          <Button className="flex-1" onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
        ) : null}
        <Button className="flex-1" disabled={isSubmitting || !value.text.trim()} type="submit">
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

