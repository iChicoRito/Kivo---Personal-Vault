import { Checkbox, Chip, EmptyState, Typography } from '@heroui/react'

import type { ItemKind, ItemSummary } from '../../data/items'

type ItemListProps = {
  items: ItemSummary[]
  view: 'list' | 'grid'
  selectable?: boolean
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
  onOpen?: (id: string) => void
  emptyTitle?: string
  emptyDescription?: string
}

const KIND_LABELS: Record<ItemKind, string> = {
  note: 'Note',
  source: 'Source',
  file: 'File',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function ItemList({
  items,
  view,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onOpen,
  emptyTitle = 'Nothing here yet.',
  emptyDescription,
}: ItemListProps) {
  if (items.length === 0) {
    return (
      <EmptyState aria-label="Empty list" className="grid justify-items-start gap-3">
        <Typography type="h2">{emptyTitle}</Typography>
        {emptyDescription ? (
          <Typography color="muted" type="body">
            {emptyDescription}
          </Typography>
        ) : null}
      </EmptyState>
    )
  }

  const selected = new Set(selectedIds)

  return (
    <ul
      className={
        view === 'grid'
          ? 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]'
          : 'grid gap-2'
      }
    >
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <div className="flex items-start gap-3 rounded-lg border border-default p-3">
            {selectable ? (
              <Checkbox
                aria-label={`Select ${item.title}`}
                isSelected={selected.has(item.id)}
                onChange={() => onToggleSelect?.(item.id)}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            ) : null}

            <button
              className="grid min-w-0 flex-1 gap-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              type="button"
              onClick={() => onOpen?.(item.id)}
            >
              <span className="flex flex-wrap items-center gap-2">
                <Chip size="sm" variant="soft">
                  {KIND_LABELS[item.kind]}
                </Chip>
                {item.isPinned ? (
                  <Chip color="accent" size="sm" variant="soft">
                    Pinned
                  </Chip>
                ) : null}
                {item.isFavorite ? (
                  <Chip color="warning" size="sm" variant="soft">
                    Favorite
                  </Chip>
                ) : null}
              </span>

              <Typography className="truncate font-semibold" type="body">
                {item.title}
              </Typography>

              <span className="flex flex-wrap items-center gap-2">
                <Typography color="muted" type="body-xs">
                  Updated <time dateTime={item.updatedAt}>{formatUpdatedAt(item.updatedAt)}</time>
                </Typography>
                {item.kind === 'file' && item.fileMissing ? (
                  <Typography className="font-semibold text-danger" type="body-xs">
                    File is missing
                  </Typography>
                ) : null}
              </span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
