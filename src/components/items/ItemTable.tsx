import {
  Button,
  Checkbox,
  Chip,
  Dropdown,
  EmptyState,
  Label,
  Pagination,
  Table,
  Typography,
  type Selection,
  type SortDescriptor,
} from '@heroui/react'
import {
  Delete02Icon,
  DeletePutBackIcon,
  EyeIcon,
  FolderOpenIcon,
  InboxIcon,
  MoreVerticalIcon,
  StarIcon,
  StarOffIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { ItemKind, ItemSummary } from '../../data/items'

export type ItemTableProps = {
  items: ItemSummary[]
  totalItems: number
  page: number
  pageSize: number
  sortDescriptor: SortDescriptor
  onSortChange: (descriptor: SortDescriptor) => void
  onPageChange: (page: number) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
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

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function ItemTable({
  items,
  totalItems,
  page,
  pageSize,
  sortDescriptor,
  onSortChange,
  onPageChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
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

  function handleSelectionChange(keys: Selection) {
    if (keys === 'all') {
      onSelectionChange?.(items.map((item) => item.id))
      return
    }

    onSelectionChange?.([...keys].map((key) => String(key)))
  }

  function handleRowAction(item: ItemSummary, key: string) {
    if (key === 'open') onOpen?.(item.id)
    else if (key === 'favorite') onToggleFavorite?.(item.id, !item.isFavorite)
    else if (key === 'move') onMove?.(item.id)
    else if (key === 'trash') onTrash?.(item.id)
    else if (key === 'restore') onRestore?.(item.id)
    else if (key === 'delete-permanently') onDeletePermanently?.(item.id)
  }

  return (
    <Table className="min-h-[200px]">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="All items"
          className="h-full"
          selectedKeys={selectable ? new Set(selectedIds) : undefined}
          selectionMode={selectable ? 'multiple' : undefined}
          sortDescriptor={sortDescriptor}
          onSelectionChange={handleSelectionChange}
          onSortChange={onSortChange}
        >
          <Table.Header>
            {selectable ? (
              <Table.Column className="pe-0">
                <Checkbox aria-label="Select all" slot="selection">
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </Table.Column>
            ) : null}

            <Table.Column allowsSorting id="title" isRowHeader>
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  Title
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column allowsSorting id="kind">
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  Kind
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column id="status">Status</Table.Column>
            <Table.Column allowsSorting id="updated">
              {({ sortDirection }) => (
                <Table.SortableColumnHeader sortDirection={sortDirection}>
                  Updated
                </Table.SortableColumnHeader>
              )}
            </Table.Column>
            <Table.Column className="w-0" id="actions">
              Action
            </Table.Column>
          </Table.Header>

          <Table.Body
            renderEmptyState={() => (
              <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                <HugeiconsIcon
                  aria-hidden="true"
                  className="text-muted"
                  icon={InboxIcon}
                  size={24}
                />
                <span className="text-sm text-muted">{emptyMessage}</span>
              </EmptyState>
            )}
          >
            {items.map((item) => (
              <Table.Row key={item.id} id={item.id}>
                {selectable ? (
                  <Table.Cell className="pe-0">
                    <Checkbox
                      aria-label={`Select ${item.title}`}
                      slot="selection"
                      variant="secondary"
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </Table.Cell>
                ) : null}

                <Table.Cell>
                  <button
                    className="text-left font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    type="button"
                    onClick={() => onOpen?.(item.id)}
                  >
                    {item.title}
                  </button>
                </Table.Cell>
                <Table.Cell>
                  <Chip size="sm" variant="soft">
                    {KIND_LABELS[item.kind]}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  <span className="flex flex-wrap items-center gap-2">
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
                    {item.kind === 'file' && item.fileMissing ? (
                      <Typography className="font-semibold text-danger" type="body-xs">
                        File is missing
                      </Typography>
                    ) : null}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Typography color="muted" type="body-xs">
                    {item.deletedAt ? (
                      <>
                        Deleted{' '}
                        <time dateTime={item.deletedAt}>{formatUpdatedAt(item.deletedAt)}</time>
                      </>
                    ) : (
                      <time dateTime={item.updatedAt}>{formatUpdatedAt(item.updatedAt)}</time>
                    )}
                  </Typography>
                </Table.Cell>
                <Table.Cell>
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
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      {totalItems > 0 ? (
        <Table.Footer>
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
                  <Pagination.Link
                    isActive={number === page}
                    onPress={() => onPageChange(number)}
                  >
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
        </Table.Footer>
      ) : null}
    </Table>
  )
}
