import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  EmptyState,
  Input,
  Label,
  Skeleton,
  Tabs,
  TextField,
  Typography,
} from '@heroui/react'
import {
  Delete02Icon,
  GridViewIcon,
  LeftToRightListBulletIcon,
  Note01Icon,
  PinIcon,
  PinOffIcon,
  PlusSignIcon,
  StarIcon,
  StarOffIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useNavigate } from 'react-router-dom'

import PageHeader from '../../app/PageHeader'
import { usePreferences } from '../../app/preferences'
import { ItemCard, type ItemCardAction } from '../../components/items/ItemCard'
import { ListScrollArea } from '../../components/items/ListScrollArea'
import { ConfirmDialog } from '../../components/items/dialogs'
import type { NoteView } from '../../data/settings'
import {
  listItems,
  saveItem,
  setItemPinned,
  setItemsFavorite,
  trashItems,
  type ItemSummary,
} from '../../data/items'
import { NoteGridCard } from './NoteGridCard'
import { notePreview } from './noteContent'
import {
  NOTE_STATUS_BAR_CLASS,
  NOTE_STATUS_CHIP_COLOR,
  noteStatus,
} from './noteStatus'
import { moduleRoutes } from '../modules/ModulePage'
import { CollectionFolderPanel } from '../collections/CollectionFolderPanel'
import { startItemDrag } from '../collections/itemDrag'

const notesModule = moduleRoutes.find((route) => route.path === 'notes')

if (!notesModule) throw new Error('Notes module metadata is missing')

const {
  description: notesDescription,
  title: notesTitle,
  loadingTitle: notesLoadingTitle,
  loadingDescription: notesLoadingDescription,
  errorTitle: notesErrorTitle,
  errorDescription: notesErrorDescription,
  emptyTitle: notesEmptyTitle,
  emptyDescription: notesEmptyDescription,
} = notesModule

const panelLabelClass = 'uppercase'

function sortPinnedFirst(items: ItemSummary[]) {
  return [...items].sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
}

function NotesLoadingSkeleton({ view }: { view: NoteView }) {
  return (
    <ul
      aria-hidden="true"
      className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-2'}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="min-w-0">
          {view === 'grid' ? (
            <div className="kivo-item-card flex h-full gap-3 rounded-3xl border border-default bg-surface p-4">
              <Skeleton className="my-auto h-1/2 w-1 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="grid min-w-0 gap-1">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-4/5 rounded-md" />
                </div>
              </div>
            </div>
          ) : (
            <div className="kivo-item-card flex items-center gap-3 rounded-3xl border border-default bg-surface p-3">
              <Skeleton className="h-8 w-1 shrink-0 rounded-full" />
              <div className="grid min-w-0 flex-1 gap-1">
                <Skeleton className="h-3 w-12 rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-4/5 rounded-md" />
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

type LoadState = 'loading' | 'ready' | 'error'

export function NotesPage() {
  const navigate = useNavigate()
  const { preferences, updatePreferences } = usePreferences()
  const view = preferences.notesView

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<ItemSummary[]>([])
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [trashTarget, setTrashTarget] = useState<ItemSummary | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    listItems({ kind: 'note', query: search.trim() || undefined })
      .then((loaded) => {
        if (!active) return
        setItems(sortPinnedFirst(loaded))
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [search, attempt])

  async function handleCreate() {
    setCreating(true)
    setActionError(null)

    try {
      const created = await saveItem({ kind: 'note', title: 'Untitled note' })
      navigate(`/notes/${created.id}`)
    } catch {
      setActionError('Kivo could not create a new note. Try again.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleFavorite(item: ItemSummary) {
    try {
      await setItemsFavorite([item.id], !item.isFavorite)
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isFavorite: !entry.isFavorite } : entry,
        ),
      )
    } catch {
      setActionError('Kivo could not change the favorite. Try again.')
    }
  }

  async function togglePin(item: ItemSummary) {
    try {
      await setItemPinned(item.id, !item.isPinned)
      setItems((current) =>
        sortPinnedFirst(
          current.map((entry) =>
            entry.id === item.id ? { ...entry, isPinned: !entry.isPinned } : entry,
          ),
        ),
      )
    } catch {
      setActionError('Kivo could not change the pin. Try again.')
    }
  }

  async function confirmTrash() {
    const target = trashTarget
    if (!target) return

    try {
      await trashItems([target.id])
      setItems((current) => current.filter((entry) => entry.id !== target.id))
      setTrashTarget(null)
    } catch {
      setActionError('Kivo could not move this note to Trash. Try again.')
      setTrashTarget(null)
    }
  }

  async function changeView(next: NoteView) {
    if (next === view) return

    try {
      setActionError(null)
      await updatePreferences({ notesView: next })
    } catch {
      setActionError('Kivo could not remember the note layout. Try again.')
    }
  }

  function handleMenuAction(item: ItemSummary, key: string) {
    if (key === 'favorite') void toggleFavorite(item)
    if (key === 'pin') void togglePin(item)
    if (key === 'trash') setTrashTarget(item)
  }

  return (
    <section aria-labelledby="notes-title" className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          description={notesDescription}
          title={notesTitle}
          titleId="notes-title"
        />
        <Button isDisabled={creating} onPress={() => void handleCreate()}>
          <HugeiconsIcon aria-hidden="true" icon={PlusSignIcon} size={18} />
          New Note
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <TextField className="w-full max-w-md" value={search} onChange={setSearch}>
          <Label>Search notes</Label>
          <Input fullWidth placeholder="I am looking for..." variant="secondary" />
        </TextField>

        <Tabs
          className="w-fit"
          selectedKey={view}
          onSelectionChange={(key) => {
            if (key === 'grid' || key === 'list') void changeView(key)
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Note layout">
              <Tabs.Tab id="grid">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon aria-hidden="true" icon={GridViewIcon} size={16} />
                  Grid
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="list">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon aria-hidden="true" icon={LeftToRightListBulletIcon} size={16} />
                  List
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      {actionError ? (
        <Typography className="font-semibold text-danger" role="alert" type="body">
          {actionError}
        </Typography>
      ) : null}

      {loadState === 'loading' ? (
        <div aria-live="polite" className="grid gap-4" role="status">
          <Typography className="sr-only">
            {notesLoadingTitle}. {notesLoadingDescription}
          </Typography>
          <ListScrollArea>
            <NotesLoadingSkeleton view={view} />
          </ListScrollArea>
        </div>
      ) : null}

      {loadState === 'error' ? (
        <Alert role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography type="h2">{notesErrorTitle}</Typography>
            <Typography type="body">{notesErrorDescription}</Typography>
            <Button
              className="justify-self-start"
              variant="secondary"
              onPress={() => setAttempt((current) => current + 1)}
            >
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'ready' && items.length === 0 && search.trim() === '' ? (
        <EmptyState className="flex min-h-[32rem] flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-default px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-background-tertiary text-muted"
          >
            <HugeiconsIcon icon={Note01Icon} size={24} />
          </span>
          <div className="grid max-w-lg gap-2">
            <Typography align="center" type="h3">
              {notesEmptyTitle}
            </Typography>
            <Typography align="center" color="muted" type="body">
              {notesEmptyDescription}
            </Typography>
          </div>
          <Button isDisabled={creating} onPress={() => void handleCreate()}>
            <HugeiconsIcon aria-hidden="true" icon={PlusSignIcon} size={18} />
            Create Note
          </Button>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && items.length === 0 && search.trim() !== '' ? (
        <EmptyState className="grid justify-items-start gap-3">
          <Typography type="h2">No notes match your search.</Typography>
          <Typography color="muted" type="body">
            Try a different word, or clear the search to see every note.
          </Typography>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && items.length > 0 ? (
        <div className="flex gap-4">
          <CollectionFolderPanel />
          <div className="min-w-0 flex-1">
            <ListScrollArea>
          <ul
            className={
              view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-2'
            }
          >
            {items.map((item) => {
              const status = noteStatus(item)

              const actions: ItemCardAction[] = [
                {
                  id: 'favorite',
                  label: item.isFavorite ? 'Remove favorite' : 'Add to favorites',
                  icon: item.isFavorite ? StarOffIcon : StarIcon,
                },
                {
                  id: 'pin',
                  label: item.isPinned ? 'Unpin' : 'Pin',
                  icon: item.isPinned ? PinOffIcon : PinIcon,
                },
                { id: 'trash', label: 'Move to trash', icon: Delete02Icon, danger: true },
              ]

              if (view === 'grid') {
                return (
                  <li
                    key={item.id}
                    className="min-w-0 select-none"
                    onPointerDown={(event) => startItemDrag(event, item.id)}
                  >
                    <NoteGridCard item={item} onOpen={() => navigate(`/notes/${item.id}`)} />
                  </li>
                )
              }

              return (
                <li
                  key={item.id}
                  className="min-w-0 select-none"
                  onPointerDown={(event) => startItemDrag(event, item.id)}
                >
                  <ItemCard
                    actions={actions}
                    chips={
                      status === 'plain' ? (
                        <Chip size="sm" variant="soft">
                          Notes
                        </Chip>
                      ) : (
                        <>
                          {item.isPinned ? (
                            <Chip color={NOTE_STATUS_CHIP_COLOR[status]} size="sm" variant="soft">
                              Pinned
                            </Chip>
                          ) : null}
                          {item.isFavorite ? (
                            <Chip color={NOTE_STATUS_CHIP_COLOR[status]} size="sm" variant="soft">
                              Favorite
                            </Chip>
                          ) : null}
                        </>
                      )
                    }
                    leading={
                      <span
                        aria-hidden="true"
                        className={`h-8 w-1 self-center rounded-full ${NOTE_STATUS_BAR_CLASS[status]}`}
                        data-note-status={status}
                      />
                    }
                    subtitle={
                      notePreview(item.content ?? '') ? (
                        <Typography className="truncate" color="muted" type="body-sm">
                          {notePreview(item.content ?? '')}
                        </Typography>
                      ) : undefined
                    }
                    title={item.title}
                    onAction={(key) => handleMenuAction(item, key)}
                    onOpen={() => navigate(`/notes/${item.id}`)}
                  />
                </li>
              )
            })}
          </ul>
            </ListScrollArea>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Move to Trash"
        description="This note leaves the Notes list and stays recoverable in the vault."
        open={trashTarget !== null}
        title="Move this note to Trash?"
        tone="danger"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void confirmTrash()}
      />
    </section>
  )
}

export default NotesPage
