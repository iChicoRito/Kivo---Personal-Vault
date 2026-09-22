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
  Tabs,
  TextField,
  Typography,
} from '@heroui/react'
import {
  Delete02Icon,
  GridViewIcon,
  LeftToRightListBulletIcon,
  Link02Icon,
  NoteEditIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import PageHeader from '../../app/PageHeader'
import { usePreferences } from '../../app/preferences'
import { ItemCard, type ItemCardAction } from '../../components/items/ItemCard'
import { ListScrollArea } from '../../components/items/ListScrollArea'
import { ConfirmDialog } from '../../components/items/dialogs'
import type { SourceView } from '../../data/settings'
import { openSourceUrl } from '../../data/files'
import { listItems, loadItem, trashItems, type VaultItem } from '../../data/items'
import { moduleRoutes } from '../modules/ModulePage'
import { CollectionFolderPanel } from '../collections/CollectionFolderPanel'
import { startItemDrag } from '../collections/itemDrag'
import { SaveSourceDialog } from './SaveSourceDialog'
import { SourceGridCard } from './SourceGridCard'

const sourcesModule = moduleRoutes.find((route) => route.path === 'sources')

if (!sourcesModule) throw new Error('Sources module metadata is missing')

const {
  description: sourcesDescription,
  title: sourcesTitle,
  loadingTitle: sourcesLoadingTitle,
  loadingDescription: sourcesLoadingDescription,
  errorTitle: sourcesErrorTitle,
  errorDescription: sourcesErrorDescription,
  emptyTitle: sourcesEmptyTitle,
  emptyDescription: sourcesEmptyDescription,
} = sourcesModule

const panelLabelClass = 'uppercase'

// Item summaries stay lean, so each row reads its full record for the address.
async function loadSources(query?: string) {
  const summaries = await listItems({ kind: 'source', query })
  return Promise.all(summaries.map((summary) => loadItem(summary.id)))
}

type LoadState = 'loading' | 'ready' | 'error'

export function SourcesPage() {
  const { preferences, updatePreferences } = usePreferences()
  const view = preferences.sourcesView

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [sources, setSources] = useState<VaultItem[]>([])
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [trashTarget, setTrashTarget] = useState<VaultItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    loadSources(search.trim() || undefined)
      .then((loaded) => {
        if (!active) return
        setSources(loaded)
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [search, attempt])

  function openCreate() {
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setDialogOpen(true)
  }

  async function handleOpen(source: VaultItem) {
    if (!source.url) return
    setActionError(null)

    try {
      await openSourceUrl(source.id)
    } catch {
      setActionError('Kivo could not open this address.')
    }
  }

  async function confirmTrash() {
    const target = trashTarget
    if (!target) return

    try {
      await trashItems([target.id])
      setSources((current) => current.filter((entry) => entry.id !== target.id))
      setTrashTarget(null)
    } catch {
      setActionError('Kivo could not move this source to Trash. Try again.')
      setTrashTarget(null)
    }
  }

  async function changeView(next: SourceView) {
    if (next === view) return

    try {
      setActionError(null)
      await updatePreferences({ sourcesView: next })
    } catch {
      setActionError('Kivo could not remember the source layout. Try again.')
    }
  }

  function handleMenuAction(source: VaultItem, key: string) {
    if (key === 'open') void handleOpen(source)
    if (key === 'edit') openEdit(source.id)
    if (key === 'trash') setTrashTarget(source)
  }

  return (
    <section aria-labelledby="sources-title" className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          description={sourcesDescription}
          title={sourcesTitle}
          titleId="sources-title"
        />
        <Button onPress={openCreate}>
          <HugeiconsIcon aria-hidden="true" icon={PlusSignIcon} size={18} />
          New Source
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <TextField className="w-full max-w-md" value={search} onChange={setSearch}>
          <Label>Search link</Label>
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
            <Tabs.List aria-label="Source layout">
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
            <Typography type="h2">{sourcesLoadingTitle}</Typography>
            <Typography color="muted" type="body">
              {sourcesLoadingDescription}
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
            <Typography type="h2">{sourcesErrorTitle}</Typography>
            <Typography type="body">{sourcesErrorDescription}</Typography>
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

      {loadState === 'ready' && sources.length === 0 && search.trim() === '' ? (
        <EmptyState className="flex min-h-[32rem] flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-default px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-background-tertiary text-muted"
          >
            <HugeiconsIcon icon={Link02Icon} size={24} />
          </span>
          <div className="grid max-w-lg gap-2">
            <Typography align="center" type="h3">
              {sourcesEmptyTitle}
            </Typography>
            <Typography align="center" color="muted" type="body">
              {sourcesEmptyDescription}
            </Typography>
          </div>
          <Button onPress={openCreate}>
            <HugeiconsIcon aria-hidden="true" icon={PlusSignIcon} size={18} />
            Create Source
          </Button>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && sources.length === 0 && search.trim() !== '' ? (
        <EmptyState className="grid justify-items-start gap-3">
          <Typography type="h2">No sources match your search.</Typography>
          <Typography color="muted" type="body">
            Try a different word, or clear the search to see every source.
          </Typography>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && sources.length > 0 ? (
        <div className="flex gap-4">
          <CollectionFolderPanel />
          <div className="min-w-0 flex-1">
            <ListScrollArea>
          <ul className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-2'}>
            {sources.map((source) => {
              const actions: ItemCardAction[] = [
                {
                  id: 'open',
                  label: 'Open link',
                  icon: Link02Icon,
                  isDisabled: !source.url,
                },
                { id: 'edit', label: 'Edit source', icon: NoteEditIcon },
                { id: 'trash', label: 'Move to trash', icon: Delete02Icon, danger: true },
              ]

              if (view === 'grid') {
                return (
                  <li
                    key={source.id}
                    className="min-w-0 select-none"
                    onPointerDown={(event) => startItemDrag(event, source.id)}
                  >
                    <SourceGridCard
                      item={source}
                      onAction={(key) => handleMenuAction(source, key)}
                      onOpen={() => void handleOpen(source)}
                    />
                  </li>
                )
              }

              return (
                <li
                  key={source.id}
                  className="min-w-0 select-none"
                  onPointerDown={(event) => startItemDrag(event, source.id)}
                >
                  <ItemCard
                    actions={actions}
                    chips={
                      <Chip color="accent" size="sm" variant="secondary">
                        Source
                      </Chip>
                    }
                    isOpenDisabled={!source.url}
                    leading={
                      <span className="grid size-11 place-items-center rounded-xl bg-default">
                        <HugeiconsIcon
                          aria-hidden="true"
                          className="text-muted"
                          icon={Link02Icon}
                          size={18}
                          strokeWidth={1.75}
                        />
                      </span>
                    }
                    subtitle={
                      <Typography className="truncate" color="muted" type="body-sm">
                        {source.url ?? 'No address saved.'}
                      </Typography>
                    }
                    title={source.title}
                    onAction={(key) => handleMenuAction(source, key)}
                    onOpen={() => void handleOpen(source)}
                  />
                </li>
              )
            })}
          </ul>
            </ListScrollArea>
          </div>
        </div>
      ) : null}

      <SaveSourceDialog
        itemId={editingId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setAttempt((current) => current + 1)}
      />

      <ConfirmDialog
        confirmLabel="Move to Trash"
        description="This source leaves the Sources list and stays recoverable in the vault."
        open={trashTarget !== null}
        title="Move this source to Trash?"
        tone="danger"
        onCancel={() => setTrashTarget(null)}
        onConfirm={() => void confirmTrash()}
      />
    </section>
  )
}

export default SourcesPage
