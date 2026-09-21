import { Button, Chip, Dropdown, Label, Typography } from '@heroui/react'
import { Delete02Icon, Link02Icon, MoreVerticalIcon, NoteEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { type ItemCardAction } from '../../components/items/ItemCard'
import type { VaultItem } from '../../data/items'

export type SourceGridCardProps = {
  item: VaultItem
  onOpen: () => void
  onAction: (id: string) => void
}

/**
 * Grid view of one source: the kind chip and menu controls, the title, the
 * address, and one primary open button. The card body is not clickable, so
 * the open button is the only way to follow the link.
 */
export function SourceGridCard({ item, onOpen, onAction }: SourceGridCardProps) {
  const actions: ItemCardAction[] = [
    { id: 'open', label: 'Open link', icon: Link02Icon, isDisabled: !item.url },
    { id: 'edit', label: 'Edit source', icon: NoteEditIcon },
    { id: 'trash', label: 'Move to trash', icon: Delete02Icon, danger: true },
  ]

  const items = actions.filter((action) => action.danger !== true)
  const dangerItems = actions.filter((action) => action.danger === true)

  return (
    <div className="kivo-item-card relative flex h-full flex-col gap-2 rounded-3xl border border-default bg-surface p-4 transition-[background-color,scale] duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:bg-surface-hover">
      <div className="flex items-center justify-between gap-2">
        <Chip color="accent" size="sm" variant="secondary">
          Source
        </Chip>

        <div className="flex items-center gap-1">
          <Dropdown>
            <Button
              aria-label={`Actions for ${item.title}`}
              className="kivo-row-actions-trigger"
              isIconOnly
              size="sm"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={MoreVerticalIcon} size={18} />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
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
        </div>
      </div>

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
    </div>
  )
}

export default SourceGridCard
