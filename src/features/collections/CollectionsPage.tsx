import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { FolderOpenIcon, Layers01Icon, StarIcon, Tag01Icon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { useSearchParams } from 'react-router-dom'

import PageHeader from '../../app/PageHeader'
import { ConfirmDialog } from '../../components/items/dialogs'
import { ItemList } from '../../components/items/ItemList'
import {
  deleteCollection,
  listCollections,
  saveCollection,
  type Collection,
} from '../../data/collections'
import { listItems, type ItemSummary } from '../../data/items'

type LoadState = 'loading' | 'ready' | 'error'

const stateLabelClass = 'uppercase'
const NO_ICON = 'kivo-no-icon'

const ICON_OPTIONS = [
  { value: '', label: 'No icon' },
  { value: 'folder', label: 'Folder' },
  { value: 'star', label: 'Star' },
  { value: 'tag', label: 'Tag' },
  { value: 'layers', label: 'Layers' },
]

const ICON_COMPONENTS: Record<string, IconSvgElement> = {
  folder: FolderOpenIcon,
  star: StarIcon,
  tag: Tag01Icon,
  layers: Layers01Icon,
}

const NAME_REQUIRED_ERROR = 'Collection name is required.'
const SAVE_ERROR = 'Kivo could not save this collection. Try again.'
const DELETE_ERROR = 'Kivo could not delete this collection. Try again.'
const ITEMS_ERROR = 'Kivo could not load items in this collection. Try again.'

type EditState = { id?: string; name: string; icon: string } | null

export function CollectionsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [collections, setCollections] = useState<Collection[]>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [itemsState, setItemsState] = useState<LoadState>('ready')
  const [items, setItems] = useState<ItemSummary[]>([])

  const [edit, setEdit] = useState<EditState>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)

  const [searchParams] = useSearchParams()
  const openedFromUrl = useRef(false)

  const loadCollections = useCallback(async () => {
    setLoadState('loading')

    try {
      const loaded = await listCollections()
      setCollections(loaded)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadCollections()
  }, [loadCollections, attempt])

  useEffect(() => {
    if (!selectedId) {
      setItems([])
      setItemsState('ready')
      return
    }

    let active = true
    setItemsState('loading')

    listItems({ collectionId: selectedId })
      .then((loaded) => {
        if (!active) return
        setItems(loaded)
        setItemsState('ready')
      })
      .catch(() => {
        if (active) setItemsState('error')
      })

    return () => {
      active = false
    }
  }, [selectedId])

  // Opens a collection linked from the URL once, without re-opening after the user goes back.
  useEffect(() => {
    if (openedFromUrl.current || selectedId || loadState !== 'ready') return

    const requestedId = searchParams.get('collection')
    if (!requestedId) return
    if (!collections.some((collection) => collection.id === requestedId)) return

    openedFromUrl.current = true
    setSelectedId(requestedId)
  }, [collections, loadState, searchParams, selectedId])

  function openCreate() {
    setEditError(null)
    setEdit({ name: '', icon: '' })
  }

  function openRename(collection: Collection) {
    setEditError(null)
    setEdit({ id: collection.id, name: collection.name, icon: collection.icon ?? '' })
  }

  async function handleSave() {
    if (!edit) return

    const name = edit.name.trim()

    if (!name) {
      setEditError(NAME_REQUIRED_ERROR)
      return
    }

    setEditError(null)

    try {
      await saveCollection({
        id: edit.id,
        name,
        icon: edit.icon ? edit.icon : null,
      })
      setEdit(null)
      await loadCollections()
    } catch {
      setEditError(SAVE_ERROR)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    const id = deleteTarget.id
    setDeleteTarget(null)
    setActionError(null)

    try {
      await deleteCollection(id)
      if (selectedId === id) setSelectedId(null)
      await loadCollections()
    } catch {
      setActionError(DELETE_ERROR)
    }
  }

  const heading = (
    <PageHeader
      description="Organize items into named collections."
      title="Collections"
      titleId="collections-title"
    />
  )

  if (loadState === 'loading') {
    return (
      <section aria-labelledby="collections-title" className="grid gap-5">
        {heading}
        <Card aria-labelledby="collections-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-2">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              LOADING
            </Typography>
            <Typography id="collections-loading-title" type="h2">
              Loading your collections
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading collections saved in this vault.
            </Typography>
          </Card.Content>
        </Card>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section aria-labelledby="collections-title" className="grid gap-5">
        {heading}
        <Alert aria-labelledby="collections-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="collections-error-title" type="h2">
              Your collections could not load
            </Typography>
            <Typography type="body">
              Kivo could not read saved collections. Try again to reload this list.
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
      </section>
    )
  }

  return (
    <section aria-labelledby="collections-title" className="grid gap-5">
      {heading}

      {actionError ? (
        <Typography className="font-semibold text-danger" role="alert" type="body">
          {actionError}
        </Typography>
      ) : null}

      {selectedId ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onPress={() => setSelectedId(null)}>
              Back to collections
            </Button>
          </div>

          {itemsState === 'loading' ? (
            <div className="flex items-center gap-3" role="status">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography color="muted" type="body">
                Loading items in this collection
              </Typography>
            </div>
          ) : null}

          {itemsState === 'error' ? (
            <Typography className="font-semibold text-danger" role="alert" type="body">
              {ITEMS_ERROR}
            </Typography>
          ) : null}

          {itemsState === 'ready' ? (
            <ItemList
              emptyDescription="Move items into this collection to see them here."
              emptyTitle="No items in this collection."
              items={items}
              view="list"
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button onPress={openCreate}>New collection</Button>
          </div>

          {collections.length === 0 ? (
            <EmptyState className="grid justify-items-start gap-3">
              <Typography type="h2">No collections yet.</Typography>
              <Typography color="muted" type="body">
                Collections you create will appear here.
              </Typography>
            </EmptyState>
          ) : (
            <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
              {collections.map((collection) => {
                const icon = collection.icon ? ICON_COMPONENTS[collection.icon] : undefined

                return (
                  <li key={collection.id} className="min-w-0">
                    <Card>
                      <Card.Content className="grid gap-3">
                        <span className="flex items-center gap-2">
                          {icon ? <HugeiconsIcon aria-hidden="true" icon={icon} size={18} /> : null}
                          <Typography className="truncate" type="h2">
                            {collection.name}
                          </Typography>
                        </span>

                        <Typography color="muted" type="body-xs">
                          {collection.itemCount === 1
                            ? '1 item'
                            : `${collection.itemCount} items`}
                        </Typography>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            aria-label={`View items in ${collection.name}`}
                            size="sm"
                            variant="secondary"
                            onPress={() => setSelectedId(collection.id)}
                          >
                            View items
                          </Button>
                          <Button
                            aria-label={`Rename ${collection.name}`}
                            size="sm"
                            variant="secondary"
                            onPress={() => openRename(collection)}
                          >
                            Rename
                          </Button>
                          <Button
                            aria-label={`Delete ${collection.name}`}
                            size="sm"
                            variant="danger"
                            onPress={() => setDeleteTarget(collection)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Card.Content>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <Modal
        isOpen={edit !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEdit(null)
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{edit?.id ? 'Rename collection' : 'New collection'}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4">
                <TextField
                  isInvalid={editError !== null}
                  value={edit?.name ?? ''}
                  onChange={(value) =>
                    setEdit((current) => (current ? { ...current, name: value } : current))
                  }
                >
                  <Label>Collection name</Label>
                  <Input fullWidth variant="secondary" />
                  {editError ? <FieldError>{editError}</FieldError> : null}
                </TextField>

                <Select
                  selectedKey={edit?.icon ? edit.icon : NO_ICON}
                  variant="secondary"
                  onSelectionChange={(key) =>
                    setEdit((current) =>
                      current
                        ? { ...current, icon: key === null || key === NO_ICON ? '' : String(key) }
                        : current,
                    )
                  }
                >
                  <Label>Icon</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id={NO_ICON} textValue="No icon">
                        No icon
                      </ListBox.Item>
                      {ICON_OPTIONS.filter((option) => option.value).map((option) => (
                        <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                          {option.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setEdit(null)}>
                  Cancel
                </Button>
                <Button onPress={() => void handleSave()}>
                  {edit?.id ? 'Save changes' : 'Create collection'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete collection"
        description="Items in this collection stay in your library. Only the collection is removed."
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete collection "${deleteTarget.name}"?` : 'Delete collection?'}
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}
