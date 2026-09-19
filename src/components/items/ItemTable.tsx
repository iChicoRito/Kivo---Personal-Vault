import {
  Button,
  Chip,
  Dropdown,
  EmptyState,
  Label,
  Pagination,
  Typography,
} from '@heroui/react'
import {
  Delete02Icon,
  DeletePutBackIcon,
  EyeIcon,
  FolderOpenIcon,
  InboxIcon,
  Link02Icon,
  MoreVerticalIcon,
  NoteEditIcon,
  StarIcon,
  StarOffIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

import type { ItemKind, ItemSummary } from '../../data/items'

export type ItemTableProps = {
  items: ItemSummary[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onOpen?: (id: string) => void
  onToggleFavorite?: (id: string, next: boolean) => void
  onMove?: (id: string) => void
  onTrash?: (id: string) => void
  onRestore?: (id: string) => void
  onDeletePermanently?: (id: string) => void
  emptyMessage?: string
}

const KIND_LABELS: Record<ItemKind, string> = {
  note: 'Note',
  source: 'Source',
  file: 'File',
}

const KIND_ICONS: Record<ItemKind, IconSvgElement> = {
  note: NoteEditIcon,
  source: Link02Icon,
  file: FolderOpenIcon,
}

export function ItemTable({
  items,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onOpen,
  onToggleFavorite,
  onMove,
  onTrash,
  onRestore,
  onDeletePermanently,
  emptyMessage = 'No items yet.',
}: ItemTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  function handleRowAction(item: ItemSummary, key: string) {
    if (key === 'open') onOpen?.(item.id)
    else if (key === 'favorite') onToggleFavorite?.(item.id, !item.isFavorite)
    else if (key === 'move') onMove?.(item.id)
    else if (key === 'trash') onTrash?.(item.id)
    else if (key === 'restore') onRestore?.(item.id)
    else if (key === 'delete-permanently') onDeletePermanently?.(item.id)
  }

  return (
    <div className="grid gap-4">
      {items.length === 0 ? (
        <EmptyState className="flex min-h-[200px] w-full flex-col items-center justify-center gap-4 text-center">
          <HugeiconsIcon aria-hidden="true" className="text-muted" icon={InboxIcon} size={24} />
          <span className="text-sm text-muted">{emptyMessage}</span>
        </EmptyState>
      ) : (
        <ul aria-label="All items" className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              {/* The row menu floats over one full-card button, so a click
                  anywhere opens the item while the menu keeps its own layer. */}
              <div className="kivo-item-card relative rounded-3xl border border-default bg-surface transition-[background-color,scale] duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:bg-surface-hover">
                <button
                  aria-label={item.title}
                  className="grid w-full grid-cols-[auto_1fr] items-center gap-3 rounded-3xl p-3 pe-14 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  onClick={() => onOpen?.(item.id)}
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-default">
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="text-muted"
                      icon={KIND_ICONS[item.kind]}
                      size={18}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="grid min-w-0 gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Chip color="accent" size="sm" variant="secondary">
                        {KIND_LABELS[item.kind]}
                      </Chip>
                      {item.kind === 'file' && item.fileMissing ? (
                        <Chip color="danger" size="sm" variant="soft">
                          File is missing
                        </Chip>
                      ) : null}
                    </span>
                    <Typography className="truncate font-semibold" type="body">
                      {item.title}
                    </Typography>
                  </span>
                </button>

                <div className="absolute inset-y-0 right-2 flex items-center">
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
                        onAction={(key) => handleRowAction(item, String(key))}
                      >
                        {onOpen ? (
                          <Dropdown.Item id="open" textValue="Open details">
                            <HugeiconsIcon aria-hidden="true" icon={EyeIcon} size={16} />
                            <Label>Open details</Label>
                          </Dropdown.Item>
                        ) : null}
                        {onToggleFavorite ? (
                          <Dropdown.Item
                            id="favorite"
                            textValue={item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                          >
                            <HugeiconsIcon
                              aria-hidden="true"
                              icon={item.isFavorite ? StarOffIcon : StarIcon}
                              size={16}
                            />
                            <Label>
                              {item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                            </Label>
                          </Dropdown.Item>
                        ) : null}
                        {onMove ? (
                          <Dropdown.Item id="move" textValue="Move to collection">
                            <HugeiconsIcon aria-hidden="true" icon={FolderOpenIcon} size={16} />
                            <Label>Move to collection</Label>
                          </Dropdown.Item>
                        ) : null}
                        {onRestore ? (
                          <Dropdown.Item id="restore" textValue="Restore">
                            <HugeiconsIcon aria-hidden="true" icon={DeletePutBackIcon} size={16} />
                            <Label>Restore</Label>
                          </Dropdown.Item>
                        ) : null}
                        <Dropdown.Section
                          aria-label="Danger zone"
                          className="mt-1 border-t border-separator pt-1"
                        >
                          {onTrash ? (
                            <Dropdown.Item id="trash" textValue="Move to trash" variant="danger">
                              <HugeiconsIcon
                                aria-hidden="true"
                                className="text-danger"
                                icon={Delete02Icon}
                                size={16}
                              />
                              <Label>Move to trash</Label>
                            </Dropdown.Item>
                          ) : null}
                          {onDeletePermanently ? (
                            <Dropdown.Item
                              id="delete-permanently"
                              textValue="Delete permanently"
                              variant="danger"
                            >
                              <HugeiconsIcon
                                aria-hidden="true"
                                className="text-danger"
                                icon={Delete02Icon}
                                size={16}
                              />
                              <Label>Delete permanently</Label>
                            </Dropdown.Item>
                          ) : null}
                        </Dropdown.Section>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalItems > 0 ? (
        <Pagination size="sm">
          <Pagination.Summary>
            Showing {start} to {end} of {totalItems} items
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous isDisabled={page <= 1} onPress={() => onPageChange(page - 1)}>
                <Pagination.PreviousIcon />
                Prev
              </Pagination.Previous>
            </Pagination.Item>
            {pageNumbers.map((number) => (
              <Pagination.Item key={number}>
                <Pagination.Link isActive={number === page} onPress={() => onPageChange(number)}>
                  {number}
                </Pagination.Link>
              </Pagination.Item>
            ))}
            <Pagination.Item>
              <Pagination.Next
                isDisabled={page >= totalPages}
                onPress={() => onPageChange(page + 1)}
              >
                Next
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      ) : null}
    </div>
  )
}
