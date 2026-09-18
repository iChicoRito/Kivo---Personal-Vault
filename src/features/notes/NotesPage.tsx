import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Chip,
  Dropdown,
  EmptyState,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import PageHeader from '../../app/PageHeader'
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

const panelLabelClass = 'uppercase tracking-[0.14em]'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

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
          eyebrow="KIVO"
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
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <div className="flex items-start gap-3 rounded-lg border border-default p-3">
                <button
                  className="grid min-w-0 flex-1 gap-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  onClick={() => navigate(`/notes/${item.id}`)}
                >
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
                  </span>

                  <Typography className="truncate font-semibold" type="body">
                    {item.title}
                  </Typography>

                  <Typography color="muted" type="body-xs">
                    Updated <time dateTime={item.updatedAt}>{formatUpdatedAt(item.updatedAt)}</time>
                  </Typography>
                </button>

                <Dropdown>
                  <Dropdown.Trigger aria-label={`Actions for ${item.title}`}>
                    Actions
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu onAction={(key) => handleMenuAction(item, String(key))}>
                      <Dropdown.Item id="favorite">
                        {item.isFavorite ? 'Remove favorite' : 'Favorite'}
                      </Dropdown.Item>
                      <Dropdown.Item id="pin">{item.isPinned ? 'Unpin' : 'Pin'}</Dropdown.Item>
                      <Dropdown.Item id="trash">Trash</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            </li>
          ))}
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
