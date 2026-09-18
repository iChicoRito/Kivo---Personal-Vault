import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  Switch,
  TextField,
  Typography,
} from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { CollectionSelect, ConfirmDialog } from '../../components/items/dialogs'
import { ItemList } from '../../components/items/ItemList'
import { listCollections, type Collection } from '../../data/collections'
import {
  listItems,
  moveItemsToCollection,
  setItemsFavorite,
  trashItems,
  type ItemFilter,
  type ItemKind,
  type ItemSort,
  type ItemSummary,
} from '../../data/items'
import { listTags, type Tag } from '../../data/tags'
import { ItemDetailsDialog } from './ItemDetailsDialog'

type LoadState = 'loading' | 'ready' | 'error'
type KindFilter = 'all' | ItemKind
type ViewMode = 'list' | 'grid'

const panelLabelClass = 'uppercase'

const KIND_OPTIONS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'note', label: 'Notes' },
  { key: 'source', label: 'Sources' },
  { key: 'file', label: 'Files' },
]

const SORT_OPTIONS: { key: ItemSort; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'created', label: 'Created' },
  { key: 'updated', label: 'Updated' },
  { key: 'kind', label: 'Kind' },
]

const ALL_COLLECTIONS = 'kivo-all-collections'
const ALL_TAGS = 'kivo-all-tags'

function buildFilter(
  kind: KindFilter,
  collectionId: string | null,
  tagId: string | null,
  favorite: boolean,
  query: string,
  sort: ItemSort,
): ItemFilter {
  const filter: ItemFilter = { sort }

  if (kind !== 'all') filter.kind = kind
  if (collectionId) filter.collectionId = collectionId
  if (tagId) filter.tagId = tagId
  if (favorite) filter.favorite = true

  const trimmedQuery = query.trim()
  if (trimmedQuery) filter.query = trimmedQuery

  return filter
}

export function ItemsPage() {
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  const [collections, setCollections] = useState<Collection[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [tagId, setTagId] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [sort, setSort] = useState<ItemSort>('updated')
  const [view, setView] = useState<ViewMode>('list')

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [moveOpen, setMoveOpen] = useState(false)
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(null)
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
    let active = true
    setLoadState('loading')

    listItems(buildFilter(kind, collectionId, tagId, favorite, query, sort))
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
  }, [attempt, kind, collectionId, tagId, favorite, query, sort])

  function reload() {
    setSelectedIds([])
    setAttempt((value) => value + 1)
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    )
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

  async function handleMove() {
    await runBatch(async () => {
      await moveItemsToCollection(selectedIds, targetCollectionId)
      setMoveOpen(false)
      setTargetCollectionId(null)
      reload()
    })
  }

  async function handleTrash() {
    await runBatch(async () => {
      await trashItems(selectedIds)
      setTrashOpen(false)
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

      <Card aria-label="Item filters">
        <Card.Content className="grid gap-4">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
            <TextField value={query} onChange={setQuery}>
              <Label>Search items</Label>
              <Input fullWidth placeholder="Search by title" variant="secondary" />
            </TextField>

            <Select
              selectedKey={kind}
              variant="secondary"
              onSelectionChange={(key) => setKind(String(key) as KindFilter)}
            >
              <Label>Kind</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {KIND_OPTIONS.map((option) => (
                    <ListBox.Item key={option.key} id={option.key} textValue={option.label}>
                      {option.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={collectionId ?? ALL_COLLECTIONS}
              variant="secondary"
              onSelectionChange={(key) =>
                setCollectionId(key === null || key === ALL_COLLECTIONS ? null : String(key))
              }
            >
              <Label>Collection</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id={ALL_COLLECTIONS} textValue="All collections">
                    All collections
                  </ListBox.Item>
                  {collections.map((collection) => (
                    <ListBox.Item
                      key={collection.id}
                      id={collection.id}
                      textValue={collection.name}
                    >
                      {collection.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={tagId ?? ALL_TAGS}
              variant="secondary"
              onSelectionChange={(key) =>
                setTagId(key === null || key === ALL_TAGS ? null : String(key))
              }
            >
              <Label>Tag</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id={ALL_TAGS} textValue="All tags">
                    All tags
                  </ListBox.Item>
                  {tags.map((tag) => (
                    <ListBox.Item key={tag.id} id={tag.id} textValue={tag.name}>
                      {tag.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={sort}
              variant="secondary"
              onSelectionChange={(key) => setSort(String(key) as ItemSort)}
            >
              <Label>Sort by</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {SORT_OPTIONS.map((option) => (
                    <ListBox.Item key={option.key} id={option.key} textValue={option.label}>
                      {option.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch isSelected={favorite} onChange={setFavorite}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Favorites only
              </Switch.Content>
            </Switch>

            <div className="flex items-center gap-2">
              <Button
                aria-pressed={view === 'list'}
                variant={view === 'list' ? 'primary' : 'secondary'}
                onPress={() => setView('list')}
              >
                List view
              </Button>
              <Button
                aria-pressed={view === 'grid'}
                variant={view === 'grid' ? 'primary' : 'secondary'}
                onPress={() => setView('grid')}
              >
                Grid view
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {selectedIds.length > 0 ? (
        <Card aria-label="Batch actions">
          <Card.Content className="flex flex-wrap items-center gap-3">
            <Typography type="body" weight="bold">
              {selectedIds.length} selected
            </Typography>
            <Button variant="secondary" onPress={() => setMoveOpen(true)}>
              Move to collection
            </Button>
            <Button variant="secondary" onPress={() => void handleFavorite(true)}>
              Mark favorite
            </Button>
            <Button variant="secondary" onPress={() => void handleFavorite(false)}>
              Remove favorite
            </Button>
            <Button variant="danger" onPress={() => setTrashOpen(true)}>
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

      {loadState === 'ready' && items.length === 0 ? (
        <EmptyState aria-labelledby="items-empty-title" className="grid justify-items-start gap-3">
          <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
            EMPTY STATE
          </Typography>
          <Typography id="items-empty-title" type="h2">
            No items yet.
          </Typography>
          <Typography color="muted" type="body">
            Saved notes, sources, files, and other items will appear here.
          </Typography>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && items.length > 0 ? (
        <ItemList
          items={items}
          selectable
          selectedIds={selectedIds}
          view={view}
          onOpen={setOpenItemId}
          onToggleSelect={handleToggleSelect}
        />
      ) : null}

      <Modal
        isOpen={moveOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) setMoveOpen(false)
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
        description="The selected items leave every list. You can restore them in a later version."
        open={trashOpen}
        title="Move selected items to Trash?"
        tone="danger"
        onCancel={() => setTrashOpen(false)}
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
