import { useState } from 'react'
import { Button, Checkbox } from '@heroui/react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Delete02Icon } from '@hugeicons/core-free-icons'

import { ConfirmDialog } from './dialogs'
import type { Selection } from './useSelection'

type SelectionBarProps = {
  selection: Selection
  /** Ids of every row currently shown; "Select all" picks exactly these. */
  visibleIds: string[]
  actionLabel: string
  onAction: (ids: string[]) => void
  isBusy?: boolean
  /** Asks "Move N items to Trash?" before `onAction`. Pages with their own dialog leave it off. */
  confirmTrash?: boolean
  /** A non-destructive action shown before the danger one, e.g. Restore in Trash. */
  secondaryAction?: { label: string; icon: IconSvgElement; onAction: (ids: string[]) => void }
}

/** Bar shown above a list while selection mode is on. */
export function SelectionBar({
  selection,
  visibleIds,
  actionLabel,
  onAction,
  isBusy,
  confirmTrash = false,
  secondaryAction,
}: SelectionBarProps) {
  const [pending, setPending] = useState<string[] | null>(null)

  if (!selection.isActive) return null

  const selected = selection.selectedIn(visibleIds)
  const allSelected = visibleIds.length > 0 && selected.length === visibleIds.length

  return (
    <div
      aria-label="Selection"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-separator bg-surface px-4 py-2.5"
      role="toolbar"
    >
      <Checkbox
        isIndeterminate={selected.length > 0 && !allSelected}
        isSelected={allSelected}
        onChange={(checked) => selection.setAll(checked ? visibleIds : [])}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <span className="text-sm font-medium">Select all</span>
        </Checkbox.Content>
      </Checkbox>

      <span aria-live="polite" className="text-sm text-muted tabular-nums">
        {selected.length} selected
      </span>

      <div className="ms-auto flex items-center gap-2">
        {secondaryAction ? (
          <Button
            isDisabled={selected.length === 0 || isBusy}
            size="sm"
            variant="secondary"
            onPress={() => secondaryAction.onAction(selected)}
          >
            <HugeiconsIcon aria-hidden="true" icon={secondaryAction.icon} size={16} strokeWidth={1.75} />
            {secondaryAction.label}
          </Button>
        ) : null}
        <Button
          isDisabled={selected.length === 0 || isBusy}
          size="sm"
          variant="danger"
          onPress={() => (confirmTrash ? setPending(selected) : onAction(selected))}
        >
          <HugeiconsIcon aria-hidden="true" icon={Delete02Icon} size={16} strokeWidth={1.75} />
          {actionLabel}
        </Button>
        <Button size="sm" variant="ghost" onPress={selection.clear}>
          Cancel
        </Button>
      </div>

      <ConfirmDialog
        confirmLabel="Move to trash"
        description="You can restore them from Trash."
        open={pending !== null}
        title={`Move ${pending?.length ?? 0} ${pending?.length === 1 ? 'item' : 'items'} to Trash?`}
        tone="danger"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) onAction(pending)
          setPending(null)
        }}
      />
    </div>
  )
}
