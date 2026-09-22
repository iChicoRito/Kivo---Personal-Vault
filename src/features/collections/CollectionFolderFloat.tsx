import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { Chip, Dropdown, Label, Typography } from '@heroui/react'
import { HugeiconsIcon } from '@hugeicons/react'

import FolderFloat, { type FolderFloatItem } from '../../components/ui/FolderFloat'
import type { ItemCardAction } from '../../components/items/ItemCard'
import type { Collection } from '../../data/collections'
import type { ItemSummary } from '../../data/items'

export type CollectionFolderFloatProps = {
  collection: Collection
  items: ItemSummary[]
  locked: boolean
  actions: ItemCardAction[]
  onAction: (id: string) => void
  onOpenCollection: (collection: Collection) => void
  onOpenItem: (item: ItemSummary) => void
}

/** The reveal shows this many item titles before it folds the rest into one pill. */
const PILL_LIMIT = 4
const MORE_VALUE = 'more'
/** Smallest half width for the fan, so two pills still share a row on a narrow card. */
const MIN_SPREAD = 106
/** Largest half width for the fan, so the pills stay a compact stack above the folder. */
const MAX_SPREAD = 150
/** Widest a pill may grow. Below `MAX_PILL` the pill follows the card instead. */
const MAX_PILL = 90
/** Narrowest a pill may get, so a title still shows a few characters. */
const MIN_PILL = 80

function countCopy(count: number) {
  return `${count} ${count === 1 ? 'Item' : 'Items'} on this collection`
}

/**
 * Grid card for one collection: the badge in the top right corner, the ReactBits
 * folder, and the name and count under it. The card stays bare until it is
 * hovered, then the folder springs its item titles out as pills; clicking a pill
 * opens the item, while clicking anywhere else on the card opens the collection
 * itself. A right click opens the same actions the list rows carry. A locked
 * collection stays bare so no title ever reaches the DOM.
 */
export function CollectionFolderFloat({
  collection,
  items,
  locked,
  actions,
  onAction,
  onOpenCollection,
  onOpenItem,
}: CollectionFolderFloatProps) {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPoint, setMenuPoint] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const menuAnchorRef = useRef<HTMLSpanElement>(null)
  const [cardWidth, setCardWidth] = useState(0)
  const protectedCollection = collection.protection !== 'none'

  useLayoutEffect(() => {
    const element = cardRef.current

    if (!element) return

    const sync = () => setCardWidth(element.clientWidth)

    sync()
    window.addEventListener('resize', sync)

    return () => window.removeEventListener('resize', sync)
  }, [])

  // The fan stays centered on the folder and never spreads wider than the pills
  // need, so it stays a compact stack above the folder instead of stretching
  // across the card. Two pills of the capped width still share a row.
  const spread = Math.min(
    MAX_SPREAD,
    Math.max(MIN_SPREAD, Math.round(cardWidth / 2) - 8),
  )

  // The pills carry the item titles, so they use as much of the card as two of
  // them can share without leaving it.
  const pillMax = Math.min(MAX_PILL, Math.max(MIN_PILL, Math.round(cardWidth / 2) - 20))

  const menuItems = actions.filter((action) => action.danger !== true)
  const dangerItems = actions.filter((action) => action.danger === true)

  const pills: FolderFloatItem[] = (locked ? [] : items.slice(0, PILL_LIMIT)).map((item) => ({
    label: item.title,
    value: item.id,
  }))

  if (!locked && items.length > PILL_LIMIT) {
    // The fold-up pill rests on the folder's own face, so the fan stays two rows
    // tall and the grid above it needs far less headroom.
    pills.push({ label: `and ${items.length - PILL_LIMIT} more`, value: MORE_VALUE, dock: true })
  }

  function handleSelect(value: string) {
    if (value === MORE_VALUE) {
      onOpenCollection(collection)
      return
    }

    const item = items.find((candidate) => candidate.id === value)

    if (item) onOpenItem(item)
  }

  function openMenuAt(x: number, y: number) {
    setMenuPoint({ x, y })
    setMenuOpen(true)
  }

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement

    // A pill opens its own item, a menu item runs its own action, and the hidden
    // menu trigger only opens the menu; all three clicks still bubble up to here.
    if (
      target.closest('.folder-float__item') ||
      target.closest('[role="menuitem"]') ||
      target.closest('.kivo-collection-card-trigger')
    ) {
      return
    }

    onOpenCollection(collection)
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()

    const bounds = cardRef.current?.getBoundingClientRect()

    openMenuAt(event.clientX - (bounds?.left ?? 0), event.clientY - (bounds?.top ?? 0))
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The context menu key and Shift + F10 open the menu from the keyboard.
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return

    event.preventDefault()
    openMenuAt(16, 16)
  }

  return (
    <div
      ref={cardRef}
      className="kivo-collection-card group relative z-0 flex h-full cursor-pointer flex-col items-center gap-2 rounded-3xl border border-default bg-surface p-3 transition-[background-color,scale] duration-300 ease-out hover:z-20 hover:bg-surface-hover data-[state=open]:z-20"
      data-state={open ? 'open' : 'closed'}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleCardKeyDown}
      style={{ '--kivo-pill-max': `${pillMax}px` } as CSSProperties}
    >
      <Chip
        className={`absolute right-3 top-3 z-10${
          locked ? '' : ' transition-opacity duration-200 group-data-[state=open]:opacity-0'
        }`}
        color={protectedCollection ? 'danger' : 'default'}
        size="sm"
        variant="soft"
      >
        {protectedCollection ? 'Protected' : 'Collection'}
      </Chip>

      {/* Two title rows rise from the folder's top and the fold-up pill docks on
          the folder itself, so the fan stays short and the pills keep clear of
          the card's rounded corner. */}
      <FolderFloat
        className="kivo-collection-folder"
        closeOnSelect={false}
        folderColor="var(--surface-secondary)"
        frontColor="var(--surface-tertiary)"
        height={124}
        itemColor="var(--default)"
        itemTextColor="var(--default-foreground)"
        items={pills}
        label={collection.name}
        labelColor="var(--foreground)"
        lift={0}
        paperColor="var(--surface)"
        physics={false}
        spread={spread}
        sublabel={countCopy(collection.itemCount)}
        trigger="hover"
        width={168}
        onOpenChange={setOpen}
        onSelect={handleSelect}
      />

      <button
        aria-label={`Open collection ${collection.name}`}
        className="grid w-full min-w-0 gap-0.5 rounded-2xl px-2 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        type="button"
      >
        <Typography className="truncate font-semibold" type="body">
          {collection.name}
        </Typography>
        <Typography className="truncate" color="muted" type="body-xs">
          {countCopy(collection.itemCount)}
        </Typography>
      </button>

      {/* The popover anchors to this zero-size mark so the menu opens where the
          pointer was, rather than at a fixed corner of the card. */}
      <span
        ref={menuAnchorRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ left: menuPoint.x, top: menuPoint.y }}
      />

      <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Dropdown.Trigger
          aria-label={`Actions for ${collection.name}`}
          className="kivo-collection-card-trigger sr-only"
        />
        <Dropdown.Popover triggerRef={menuAnchorRef}>
          <Dropdown.Menu
            autoFocus
            className="kivo-row-actions-menu"
            onAction={(key) => onAction(String(key))}
          >
            {menuItems.map((action) => (
              <Dropdown.Item
                key={action.id}
                id={action.id}
                isDisabled={action.isDisabled}
                textValue={action.label}
              >
                <HugeiconsIcon aria-hidden="true" icon={action.icon} size={16} />
                <Label>{action.label}</Label>
              </Dropdown.Item>
            ))}
            {dangerItems.length > 0 ? (
              <Dropdown.Section
                aria-label="Danger zone"
                className="mt-1 border-t border-separator pt-1"
              >
                {dangerItems.map((action) => (
                  <Dropdown.Item
                    key={action.id}
                    id={action.id}
                    isDisabled={action.isDisabled}
                    textValue={action.label}
                    variant="danger"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="text-danger"
                      icon={action.icon}
                      size={16}
                    />
                    <Label>{action.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            ) : null}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  )
}
