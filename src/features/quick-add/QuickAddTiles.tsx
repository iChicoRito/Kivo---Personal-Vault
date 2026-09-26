import { useId } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  FileImportIcon,
  Layers01Icon,
  Link02Icon,
  NoteEditIcon,
} from '@hugeicons/core-free-icons'

export type QuickAddAction = 'note' | 'source' | 'file' | 'collection'

const actions: Array<{
  label: string
  hint: string
  action: QuickAddAction
  icon: IconSvgElement
}> = [
  { label: 'New note', hint: 'Write in the editor', action: 'note', icon: NoteEditIcon },
  { label: 'New source', hint: 'Save a web link', action: 'source', icon: Link02Icon },
  { label: 'Import file', hint: 'Copy into the vault', action: 'file', icon: FileImportIcon },
  { label: 'New collection', hint: 'Group related items', action: 'collection', icon: Layers01Icon },
]

type QuickAddTilesProps = {
  onSelect: (action: QuickAddAction) => void
  isDisabled?: boolean
}

export function QuickAddTiles({ onSelect, isDisabled = false }: QuickAddTilesProps) {
  const id = useId()

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((entry) => (
        <button
          key={entry.action}
          aria-describedby={`${id}-${entry.action}`}
          aria-label={entry.label}
          className="grid content-start gap-2 rounded-xl border border-separator p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50"
          disabled={isDisabled}
          type="button"
          onClick={() => onSelect(entry.action)}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
            <HugeiconsIcon aria-hidden="true" icon={entry.icon} size={16} strokeWidth={1.75} />
          </span>
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{entry.label}</span>
            <span className="text-xs text-muted" id={`${id}-${entry.action}`}>
              {entry.hint}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
