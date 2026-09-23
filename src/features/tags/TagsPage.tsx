import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FieldError,
  Input,
  Label,
  Modal,
  Skeleton,
  TextField,
  Typography,
} from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ConfirmDialog } from '../../components/items/dialogs'
import { ItemList } from '../../components/items/ItemList'
import { listItems, type ItemSummary } from '../../data/items'
import { deleteTag, listTags, saveTag, type Tag } from '../../data/tags'

type LoadState = 'loading' | 'ready' | 'error'

const stateLabelClass = 'uppercase'

const NAME_REQUIRED_ERROR = 'Tag name is required.'
const SAVE_ERROR = 'Kivo could not save this tag. Try again.'
const DELETE_ERROR = 'Kivo could not delete this tag. Try again.'
const ITEMS_ERROR = 'Kivo could not load items with this tag. Try again.'

type EditState = { id?: string; name: string } | null

export function TagsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [tags, setTags] = useState<Tag[]>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [itemsState, setItemsState] = useState<LoadState>('ready')
  const [items, setItems] = useState<ItemSummary[]>([])

  const [edit, setEdit] = useState<EditState>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)

  const loadTags = useCallback(async () => {
    setLoadState('loading')

    try {
      const loaded = await listTags()
      setTags(loaded)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadTags()
  }, [loadTags, attempt])

  useEffect(() => {
    if (!selectedId) {
      setItems([])
      setItemsState('ready')
      return
    }

    let active = true
    setItemsState('loading')

    listItems({ tagId: selectedId })
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

  function openCreate() {
    setEditError(null)
    setEdit({ name: '' })
  }

  function openRename(tag: Tag) {
    setEditError(null)
    setEdit({ id: tag.id, name: tag.name })
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
      await saveTag({ id: edit.id, name })
      setEdit(null)
      await loadTags()
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
      await deleteTag(id)
      if (selectedId === id) setSelectedId(null)
      await loadTags()
    } catch {
      setActionError(DELETE_ERROR)
    }
  }

  const heading = (
    <PageHeader
      description="Use tags to describe saved items."
      title="Tags"
      titleId="tags-title"
    />
  )

  if (loadState === 'loading') {
    return (
      <section aria-labelledby="tags-title" className="grid gap-5">
        {heading}
        <div
          aria-labelledby="tags-loading-title"
          aria-live="polite"
          className="grid gap-5"
          role="status"
        >
          <Card>
            <Card.Content className="grid gap-2">
              <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
              <Typography id="tags-loading-title" type="h2">
                Loading your tags
              </Typography>
              <Typography color="muted" type="body">
                Kivo is reading tags used in this vault.
              </Typography>
            </Card.Content>
          </Card>

          <ul
            aria-hidden="true"
            className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="min-w-0">
                <Card>
                  <Card.Content className="grid gap-3">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-8 w-20 rounded-lg" />
                      <Skeleton className="h-8 w-16 rounded-lg" />
                      <Skeleton className="h-8 w-16 rounded-lg" />
                    </div>
                  </Card.Content>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section aria-labelledby="tags-title" className="grid gap-5">
        {heading}
        <Alert aria-labelledby="tags-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="tags-error-title" type="h2">
              Your tags could not load
            </Typography>
            <Typography type="body">
              Kivo could not read saved tags. Try again to reload this list.
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
    <section aria-labelledby="tags-title" className="grid gap-5">
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
              Back to tags
            </Button>
          </div>

          {itemsState === 'loading' ? (
            <div className="grid gap-3" role="status">
              <Typography color="muted" type="body">
                Loading items with this tag
              </Typography>
              <ul aria-hidden="true" className="grid gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="min-w-0">
                    <div className="grid gap-2 rounded-lg border border-default p-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-12 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-2/5 rounded-md" />
                      <Skeleton className="h-4 w-1/4 rounded-md" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {itemsState === 'error' ? (
            <Typography className="font-semibold text-danger" role="alert" type="body">
              {ITEMS_ERROR}
            </Typography>
          ) : null}

          {itemsState === 'ready' ? (
            <ItemList
              emptyDescription="Assign this tag to items to see them here."
              emptyTitle="No items with this tag."
              items={items}
              view="list"
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button onPress={openCreate}>New tag</Button>
          </div>

          {tags.length === 0 ? (
            <EmptyState className="grid justify-items-start gap-3">
              <Typography type="h2">No tags yet.</Typography>
              <Typography color="muted" type="body">
                Tags assigned to saved items will appear here.
              </Typography>
            </EmptyState>
          ) : (
            <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
              {tags.map((tag) => (
                <li key={tag.id} className="min-w-0">
                  <Card>
                    <Card.Content className="grid gap-3">
                      <Typography className="truncate" type="h2">
                        {tag.name}
                      </Typography>

                      <Typography color="muted" type="body-xs">
                        {tag.count === 1 ? '1 item' : `${tag.count} items`}
                      </Typography>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`View items tagged ${tag.name}`}
                          size="sm"
                          variant="secondary"
                          onPress={() => setSelectedId(tag.id)}
                        >
                          View items
                        </Button>
                        <Button
                          aria-label={`Rename ${tag.name}`}
                          size="sm"
                          variant="secondary"
                          onPress={() => openRename(tag)}
                        >
                          Rename
                        </Button>
                        <Button
                          aria-label={`Delete ${tag.name}`}
                          size="sm"
                          variant="danger"
                          onPress={() => setDeleteTarget(tag)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card.Content>
                  </Card>
                </li>
              ))}
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
                <Modal.Heading>{edit?.id ? 'Rename tag' : 'New tag'}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  isInvalid={editError !== null}
                  value={edit?.name ?? ''}
                  onChange={(value) =>
                    setEdit((current) => (current ? { ...current, name: value } : current))
                  }
                >
                  <Label>Tag name</Label>
                  <Input fullWidth variant="secondary" />
                  {editError ? <FieldError>{editError}</FieldError> : null}
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setEdit(null)}>
                  Cancel
                </Button>
                <Button onPress={() => void handleSave()}>
                  {edit?.id ? 'Save changes' : 'Create tag'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete tag"
        description="Items with this tag stay in your library. Only the tag is removed."
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete tag "${deleteTarget.name}"?` : 'Delete tag?'}
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}
