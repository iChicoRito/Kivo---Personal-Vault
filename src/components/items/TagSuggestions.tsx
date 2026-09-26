import { useEffect, useState } from 'react'
import { Button, Chip, Typography } from '@heroui/react'

import { usePreferences } from '../../app/preferences'
import { suggestTags } from '../../data/insights'

type TagSuggestionsProps = {
  itemId: string
  value: string[]
  onChange: (next: string[]) => void
}

/**
 * Terms pulled from the item's own text on this device. Each suggestion waits
 * for an Add click, and a dismiss drops it from the row. Nothing is written
 * until the caller's `onChange` reaches the existing tag save path.
 */
export function TagSuggestions({ itemId, value, onChange }: TagSuggestionsProps) {
  const { preferences } = usePreferences()
  const [suggestions, setSuggestions] = useState<string[]>([])
  const enabled = preferences.autoTag

  useEffect(() => {
    if (!enabled || !itemId) {
      setSuggestions([])
      return
    }

    let active = true

    suggestTags(itemId)
      .then((loaded) => {
        if (active) setSuggestions(Array.isArray(loaded) ? loaded : [])
      })
      .catch(() => {
        if (active) setSuggestions([])
      })

    return () => {
      active = false
    }
  }, [enabled, itemId])

  if (!enabled || !itemId) return null

  const visible = suggestions.filter(
    (name) => !value.some((tag) => tag.toLowerCase() === name.toLowerCase()),
  )

  if (visible.length === 0) return null

  function accept(name: string) {
    const existing = value.find((tag) => tag.toLowerCase() === name.toLowerCase())

    if (!existing) onChange([...value, name])

    setSuggestions((current) =>
      current.filter((entry) => entry.toLowerCase() !== name.toLowerCase()),
    )
  }

  function dismiss(name: string) {
    setSuggestions((current) =>
      current.filter((entry) => entry.toLowerCase() !== name.toLowerCase()),
    )
  }

  return (
    <div className="grid gap-2">
      <Typography className="text-muted" type="body-xs">
        Suggested on this device
      </Typography>
      <ul className="grid gap-1">
        {visible.map((name) => (
          <li key={name} className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft">
              {name}
            </Chip>
            <Button size="sm" variant="tertiary" onPress={() => accept(name)}>
              Add
            </Button>
            <Button
              aria-label={`Dismiss ${name} suggestion`}
              size="sm"
              variant="tertiary"
              onPress={() => dismiss(name)}
            >
              Dismiss
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TagSuggestions
