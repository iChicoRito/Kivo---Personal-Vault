import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react'
import {
  Delete02Icon,
  PinIcon,
  PinOffIcon,
  StarIcon,
  StarOffIcon,
} from '@hugeicons/core-free-icons'
import { useNavigate } from 'react-router-dom'

import PageHeader from '../../app/PageHeader'
import { ItemCard, type ItemCardAction } from '../../components/items/ItemCard'
import { ConfirmDialog } from '../../components/items/dialogs'
import {
  listItems,
  saveItem,
  setItemPinned,
  setItemsFavorite,
  trashItems,
  type ItemSummary,
} from '../../data/items'
import { moduleRoutes } from '../modules/ModulePage'

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

type LoadState = 'loading' | 'ready' | 'error'

export function NotesPage() {
  const navigate = useNavigate()

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
          New note
        </Button>
      </div>

      <TextField value={search} onChange={setSearch}>
        <Label>Search notes</Label>
        <Input fullWidth placeholder="Search notes" variant="secondary" />
      </TextField>

      {actionError ? (
        <Typography className="font-semibold text-danger" role="alert" type="body">
          {actionError}
        </Typography>
      ) : null}

      {loadState === 'loading' ? (
        <Card aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
            </div>
            <Typography type="h2">{notesLoadingTitle}</Typography>
            <Typography color="muted" type="body">
              {notesLoadingDescription}
            </Typography>
          </Card.Content>
        </Card>
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

      {loadState === 'ready' && items.length === 0 ? (
        <EmptyState className="grid justify-items-start gap-3">
          <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
            EMPTY STATE
          </Typography>
          <Typography type="h2">{notesEmptyTitle}</Typography>
          <Typography color="muted" type="body">
            {notesEmptyDescription}
          </Typography>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item) => {
            const status =
              item.isPinned && item.isFavorite
                ? 'pinned-favorite'
                : item.isPinned
                  ? 'pinned'
                  : item.isFavorite
                    ? 'favorite'
                    : 'plain'

            const statusColor: 'accent' | 'default' | 'success' | 'warning' =
              status === 'pinned-favorite'
                ? 'success'
                : status === 'pinned'
                  ? 'accent'
                  : status === 'favorite'
                    ? 'warning'
                    : 'default'

            const barClass =
              status === 'pinned-favorite'
                ? 'bg-success'
                : status === 'pinned'
                  ? 'bg-accent'
                  : status === 'favorite'
                    ? 'bg-warning'
                    : 'bg-foreground'

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

            return (
              <li key={item.id} className="min-w-0">
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
                          <Chip color={statusColor} size="sm" variant="soft">
                            Pinned
                          </Chip>
                        ) : null}
                        {item.isFavorite ? (
                          <Chip color={statusColor} size="sm" variant="soft">
                            Favorite
                          </Chip>
                        ) : null}
                      </>
                    )
                  }
                  leading={
                    <span
                      aria-hidden="true"
                      className={`w-1 self-stretch rounded-full ${barClass}`}
                      data-note-status={status}
                    />
                  }
                  title={item.title}
                  onAction={(key) => handleMenuAction(item, key)}
                  onOpen={() => navigate(`/notes/${item.id}`)}
                />
              </li>
            )
          })}
        </ul>
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
