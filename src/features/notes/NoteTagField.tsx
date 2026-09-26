import { useId, useState } from 'react'
import { Button, Input, Label, Tag, TagGroup, TextField, Typography } from '@heroui/react'

import { TagSuggestions } from '../../components/items/TagSuggestions'

type NoteTagFieldProps = {
  itemId: string
  value: string[]
  onChange: (next: string[]) => void
}

/**
 * The sidebar tag field: a name box with the Add Tag button under it, and the
 * note's tags as chips below. Each chip carries its own remove control, which
 * `globals.css` keeps out of sight until the chip is hovered or focused.
 */
export function NoteTagField({ itemId, value, onChange }: NoteTagFieldProps) {
  const [draft, setDraft] = useState('')
  const tagsLabelId = useId()

  function addTag() {
    const name = draft.trim()
    if (!name || value.includes(name)) return

    setDraft('')
    onChange([...value, name])
  }

  return (
    <div className="grid gap-3">
      <TextField value={draft} onChange={setDraft}>
        <Label>
          Tag name{' '}
          <span aria-hidden="true" className="text-danger">
            *
          </span>
        </Label>
        <Input
          fullWidth
          placeholder="Enter tag name"
          variant="secondary"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            addTag()
          }}
        />
      </TextField>

      <Button fullWidth variant="secondary" onPress={addTag}>
        Add Tag
      </Button>

      <Typography className="text-muted" id={tagsLabelId} type="body-xs">
        Tags
      </Typography>

      {value.length ? (
        <TagGroup
          aria-labelledby={tagsLabelId}
          className="kivo-note-tags"
          onRemove={(keys) => onChange(value.filter((tag) => !keys.has(tag)))}
        >
          <TagGroup.List>
            {value.map((tag) => (
              <Tag key={tag} id={tag}>
                <span aria-hidden="true">#</span>
                {tag}
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      ) : (
        <Typography className="text-muted" type="body-xs">
          No tags yet.
        </Typography>
      )}

      <TagSuggestions itemId={itemId} value={value} onChange={onChange} />
    </div>
  )
}

export default NoteTagField
