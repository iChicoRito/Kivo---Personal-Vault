import { Button, Dropdown, Label, Typography } from '@heroui/react'
import { MoreVerticalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import type { ReactNode } from 'react'

export type ItemCardAction = {
  id: string
  label: string
  icon: IconSvgElement
  isDisabled?: boolean
  danger?: boolean
}

export type ItemCardProps = {
  title: string
  leading?: ReactNode
  chips?: ReactNode
  subtitle?: ReactNode
  actions: ItemCardAction[]
  onOpen?: () => void
  isOpenDisabled?: boolean
  onAction?: (id: string) => void
}

export function ItemCard({
  title,
  leading,
  chips,
  subtitle,
  actions,
  onOpen,
  isOpenDisabled,
  onAction,
}: ItemCardProps) {
  const items = actions.filter((action) => action.danger !== true)
  const dangerItems = actions.filter((action) => action.danger === true)

  return (
    <div className="kivo-item-card relative rounded-3xl border border-default bg-surface transition-[background-color,scale] duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:bg-surface-hover">
      {/* The menu floats over one full-card button, so a click anywhere opens
          the item while the menu keeps its own layer. */}
      <button
        aria-label={title}
        className="flex w-full items-center gap-3 rounded-3xl p-3 pe-14 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isOpenDisabled}
        type="button"
        onClick={onOpen}
      >
        {leading}
        <span className="grid min-w-0 flex-1 gap-1">
          {chips ? <span className="flex flex-wrap items-center gap-2">{chips}</span> : null}
          <Typography className="truncate font-semibold" type="body">
            {title}
          </Typography>
          {subtitle}
        </span>
      </button>

      <div className="absolute inset-y-0 right-2 flex items-center">
        <Dropdown>
          <Button
            aria-label={`Actions for ${title}`}
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
              onAction={(key) => onAction?.(String(key))}
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
  )
}
