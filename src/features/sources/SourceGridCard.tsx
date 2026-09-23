import { Button, Chip, Dropdown, Label, Typography } from '@heroui/react'
import { Delete02Icon, Link02Icon, NoteEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRef, useState } from 'react'

import { type ItemCardAction } from '../../components/items/ItemCard'
import type { VaultItem } from '../../data/items'

export type SourceGridCardProps = {
  item: VaultItem
  onOpen: () => void
  onAction: (id: string) => void
}

/**
 * Grid view of one source: the kind chip, the title, the address, and one
 * primary open button. The card body is not clickable and the actions open
 * from the right-click menu, so the open button is the only way to follow
 * the link.
 */
export function SourceGridCard({ item, onOpen, onAction }: SourceGridCardProps) {
  const actions: ItemCardAction[] = [
    { id: 'open', label: 'Open link', icon: Link02Icon, isDisabled: !item.url },
    { id: 'edit', label: 'Edit source', icon: NoteEditIcon },
    { id: 'trash', label: 'Move to trash', icon: Delete02Icon, danger: true },
  ]

  const items = actions.filter((action) => action.danger !== true)
  const dangerItems = actions.filter((action) => action.danger === true)
  const hasMenu = items.length > 0 || dangerItems.length > 0

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPoint, setMenuPoint] = useState({ x: 0, y: 0 })
  const menuAnchorRef = useRef<HTMLSpanElement>(null)

  return (
    <div
      className="kivo-item-card relative flex h-full flex-col gap-2 rounded-3xl border border-default bg-surface p-4 transition-[background-color,scale] duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:bg-surface-hover"
      onContextMenu={(event) => {
        event.preventDefault()

        if (!hasMenu) return

        const bounds = event.currentTarget.getBoundingClientRect()
        setMenuPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
        setMenuOpen(true)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return

        event.preventDefault()

        if (!hasMenu) return

        setMenuPoint({ x: 16, y: 16 })
        setMenuOpen(true)
      }}
    >
      <Chip className="self-start" color="accent" size="sm" variant="secondary">
        Source
      </Chip>

      <div className="grid min-w-0 gap-0.5">
        <Typography className="truncate font-semibold" type="body">
          {item.title}
        </Typography>
        <Typography className="line-clamp-2" color="muted" type="body-sm">
          {item.url ?? 'No address saved.'}
        </Typography>
      </div>

      <Button className="mt-auto self-start" isDisabled={!item.url} onPress={onOpen}>
        Open Link
      </Button>

      {hasMenu ? (
        <>
          {/* The popover anchors to this zero-size mark so the menu opens where
              the pointer was, rather than at a fixed corner of the card. */}
          <span
            ref={menuAnchorRef}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ left: menuPoint.x, top: menuPoint.y }}
          />
          <Dropdown
            isOpen={menuOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) setMenuOpen(false)
            }}
          >
            <Dropdown.Trigger aria-label={`Actions for ${item.title}`} className="sr-only" />
            <Dropdown.Popover triggerRef={menuAnchorRef}>
              <Dropdown.Menu
                autoFocus
                className="kivo-row-actions-menu"
                onAction={(key) => onAction(String(key))}
              >
                {items.map((action) => (
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
        </>
      ) : null}
    </div>
  )
}

export default SourceGridCard
