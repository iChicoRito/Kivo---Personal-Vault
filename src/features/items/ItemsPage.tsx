import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
  Typography,
  type SortDescriptor,
} from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { CollectionSelect, ConfirmDialog } from '../../components/items/dialogs'
import { FilterMenu, type KindFilter } from '../../components/items/FilterMenu'
import { ItemTable } from '../../components/items/ItemTable'
import { listCollections, type Collection } from '../../data/collections'
import {
  listItems,
  moveItemsToCollection,
  setItemsFavorite,
  trashItems,
  type ItemFilter,
  type ItemSummary,
} from '../../data/items'
import { listTags, type Tag } from '../../data/tags'
import { QuickAddMenu } from '../quick-add/QuickAddMenu'
import { ItemDetailsDialog } from './ItemDetailsDialog'

type LoadState = 'loading' | 'ready' | 'error'

const PAGE_SIZE = 10
const panelLabelClass = 'uppercase'

function buildFilter(
  kind: KindFilter,
  collectionId: string | null,
  tagId: string | null,
  favorite: boolean,
  query: string,
): ItemFilter {
  const filter: ItemFilter = {}

  if (kind !== 'all') filter.kind = kind
  if (collectionId) filter.collectionId = collectionId
  if (tagId) filter.tagId = tagId
  if (favorite) filter.favorite = true

  const trimmedQuery = query.trim()
  if (trimmedQuery) filter.query = trimmedQuery

  return filter
}

function sortItems(items: ItemSummary[], descriptor: SortDescriptor): ItemSummary[] {
  const direction = descriptor.direction === 'descending' ? -1 : 1
  const column = String(descriptor.column)

  return [...items].sort((first, second) => {
    let result: number

    if (column === 'title') result = first.title.localeCompare(second.title)
    else if (column === 'kind') result = first.kind.localeCompare(second.kind)
    else if (column === 'updated') result = first.updatedAt.localeCompare(second.updatedAt)
    else result = 0

    return result * direction
  })
}

export function ItemsPage() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  const [collections, setCollections] = useState<Collection[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [collectionId, setCollectionId] = useState<string | null>(() =>
    searchParams.get('collection'),
  )
  const [tagId, setTagId] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'updated',
    direction: 'descending',
  })
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [moveIds, setMoveIds] = useState<string[]>([])
  const [moveOpen, setMoveOpen] = useState(false)
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(null)
  const [trashIds, setTrashIds] = useState<string[]>([])
  const [trashOpen, setTrashOpen] = useState(false)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [batchError, setBatchError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([listCollections(), listTags()])
      .then(([loadedCollections, loadedTags]) => {
        if (!active) return
        setCollections(loadedCollections)
        setTags(loadedTags)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setCollectionId(searchParams.get('collection'))
  }, [searchParams])

  useEffect(() => {
    let active = true
    setLoadState('loading')

    listItems(buildFilter(kind, collectionId, tagId, favorite, query))
      .then((loaded) => {
        if (!active) return
        setItems(loaded)
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [attempt, kind, collectionId, tagId, favorite, query])

  useEffect(() => {
    setPage(1)
  }, [kind, collectionId, tagId, favorite, query, sortDescriptor])

  const sortedItems = useMemo(() => sortItems(items, sortDescriptor), [items, sortDescriptor])
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedItems = useMemo(
    () => sortedItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedItems, currentPage],
  )
  const hasActiveFilters =
    kind !== 'all' || collectionId !== null || tagId !== null || favorite || query.trim() !== ''

  function reload() {
    setSelectedIds([])
    setAttempt((value) => value + 1)
  }

  async function runBatch(action: () => Promise<void>) {
    setBatchError(null)

    try {
      await action()
    } catch {
      setBatchError('Kivo could not finish that action. Your items are unchanged. Try again.')
    }
  }

  async function handleFavorite(nextFavorite: boolean) {
    await runBatch(async () => {
      await setItemsFavorite(selectedIds, nextFavorite)
      reload()
    })
  }

  async function handleRowFavorite(id: string, nextFavorite: boolean) {
    await runBatch(async () => {
      await setItemsFavorite([id], nextFavorite)
      reload()
    })
  }

  function openMove(ids: string[]) {
    setMoveIds(ids)
    setTargetCollectionId(null)
    setMoveOpen(true)
  }

  function openTrash(ids: string[]) {
    setTrashIds(ids)
    setTrashOpen(true)
  }

  async function handleMove() {
    await runBatch(async () => {
      await moveItemsToCollection(moveIds, targetCollectionId)
      setMoveOpen(false)
      setMoveIds([])
      setTargetCollectionId(null)
      reload()
    })
  }

  async function handleTrash() {
    await runBatch(async () => {
      await trashItems(trashIds)
      setTrashOpen(false)
      setTrashIds([])
      reload()
    })
  }

  return (
    <section aria-labelledby="items-title" className="grid gap-5">
      <PageHeader
        description="Browse saved items from one place."
        title="All Items"
        titleId="items-title"
      />

      <div className="flex flex-wrap items-end gap-3">
        <TextField className="w-full max-w-sm" value={query} onChange={setQuery}>
          <Label>Search items</Label>
          <Input fullWidth placeholder="Search by title" variant="secondary" />
        </TextField>

        <FilterMenu
          collectionId={collectionId}
          collections={collections}
          favoritesOnly={favorite}
          kind={kind}
          tagId={tagId}
          tags={tags}
          onClear={() => {
            setKind('all')
            setCollectionId(null)
            setTagId(null)
            setFavorite(false)
          }}
          onCollectionChange={setCollectionId}
          onFavoritesChange={setFavorite}
          onKindChange={setKind}
          onTagChange={setTagId}
        />

        <div className="ms-auto">
          <QuickAddMenu onAdded={() => setAttempt((value) => value + 1)} />
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <Card aria-label="Batch actions">
          <Card.Content className="flex flex-wrap items-center gap-3">
            <Typography type="body" weight="bold">
              {selectedIds.length} selected
            </Typography>
            <Button variant="secondary" onPress={() => openMove(selectedIds)}>
              Move to collection
            </Button>
            <Button variant="secondary" onPress={() => void handleFavorite(true)}>
              Mark favorite
            </Button>
            <Button variant="secondary" onPress={() => void handleFavorite(false)}>
              Remove favorite
            </Button>
            <Button variant="danger" onPress={() => openTrash(selectedIds)}>
              Trash
            </Button>
            <Button variant="secondary" onPress={() => setSelectedIds([])}>
              Clear selection
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {batchError ? (
        <Alert role="alert" status="danger">
          <Alert.Content className="grid gap-2">
            <Typography className="font-semibold text-danger" type="body">
              {batchError}
            </Typography>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'loading' ? (
        <Card aria-labelledby="items-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
            </div>
            <Typography id="items-loading-title" type="h2">
              Loading your items
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading saved items on this device.
            </Typography>
          </Card.Content>
        </Card>
      ) : null}

      {loadState === 'error' ? (
        <Alert aria-labelledby="items-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="items-error-title" type="h2">
              Your items could not load
            </Typography>
            <Typography type="body">
              Kivo could not read saved items. Try again to reload this list.
            </Typography>
            <Button
              className="justify-self-start"
              variant="secondary"
              onPress={() => setAttempt((value) => value + 1)}
            >
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'ready' ? (
        <ItemTable
          emptyMessage={
            hasActiveFilters
              ? 'No items match your search or filters.'
              : 'No items yet. Save a note, source, or file to see it here.'
          }
          items={pagedItems}
          page={currentPage}
          pageSize={PAGE_SIZE}
          selectable
          selectedIds={selectedIds}
          sortDescriptor={sortDescriptor}
          totalItems={sortedItems.length}
          onMove={(id) => openMove([id])}
          onOpen={setOpenItemId}
          onPageChange={setPage}
          onSelectionChange={setSelectedIds}
          onSortChange={setSortDescriptor}
          onToggleFavorite={(id, next) => {
            void handleRowFavorite(id, next)
          }}
          onTrash={(id) => openTrash([id])}
        />
      ) : null}

      <Modal
        isOpen={moveOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setMoveOpen(false)
            setMoveIds([])
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Move to collection</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CollectionSelect
                  label="Collection"
                  value={targetCollectionId}
                  onChange={setTargetCollectionId}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setMoveOpen(false)}>
                  Cancel
                </Button>
                <Button onPress={() => void handleMove()}>Move</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmDialog
        confirmLabel="Move to trash"
        description={
          trashIds.length === 1
            ? 'This item leaves every list. You can restore it from Trash.'
            : 'The selected items leave every list. You can restore them from Trash.'
        }
        open={trashOpen}
        title={trashIds.length === 1 ? 'Move this item to Trash?' : 'Move selected items to Trash?'}
        tone="danger"
        onCancel={() => {
          setTrashOpen(false)
          setTrashIds([])
        }}
        onConfirm={() => void handleTrash()}
      />

      <ItemDetailsDialog
        itemId={openItemId}
        onChanged={() => setAttempt((value) => value + 1)}
        onClose={() => setOpenItemId(null)}
      />
    </section>
  )
}

export default ItemsPage
