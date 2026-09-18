import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ConfirmDialog } from '../../components/items/dialogs'
import { openSourceUrl } from '../../data/files'
import { listItems, loadItem, trashItems, type VaultItem } from '../../data/items'
import { moduleRoutes } from '../modules/ModulePage'
import { SaveSourceDialog } from './SaveSourceDialog'

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

// Item summaries stay lean, so each row reads its full record for the address and summary.
async function loadSources(query?: string) {
  const summaries = await listItems({ kind: 'source', query })
  return Promise.all(summaries.map((summary) => loadItem(summary.id)))
}

type LoadState = 'loading' | 'ready' | 'error'

export function SourcesPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [sources, setSources] = useState<VaultItem[]>([])
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [trashTarget, setTrashTarget] = useState<VaultItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
    },
    [],
  )

  function openCreate() {
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setDialogOpen(true)
  }

  async function handleOpen(source: VaultItem) {
    setActionError(null)

    try {
      await openSourceUrl(source.id)
    } catch {
      setActionError('Kivo could not open this address.')
    }
  }

  async function handleCopy(source: VaultItem) {
    if (!source.url) return
    setActionError(null)

    try {
      await navigator.clipboard.writeText(source.url)
      setCopiedId(source.id)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setActionError('Kivo could not copy this address.')
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

  return (
    <section aria-labelledby="sources-title" className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          description={sourcesDescription}
          eyebrow="KIVO"
          title={sourcesTitle}
          titleId="sources-title"
        />
        <Button onPress={openCreate}>New source</Button>
      </div>

      <TextField value={search} onChange={setSearch}>
        <Label>Search sources</Label>
        <Input fullWidth placeholder="Search sources" variant="secondary" />
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

      {loadState === 'ready' && sources.length === 0 ? (
        <EmptyState className="grid justify-items-start gap-3">
          <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
            EMPTY STATE
          </Typography>
          <Typography type="h2">{sourcesEmptyTitle}</Typography>
          <Typography color="muted" type="body">
            {sourcesEmptyDescription}
          </Typography>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && sources.length > 0 ? (
        <ul className="grid gap-2">
          {sources.map((source) => (
            <li key={source.id} className="min-w-0">
              <div className="grid gap-3 rounded-lg border border-default p-3">
                <div className="grid min-w-0 gap-1">
                  <Typography className="truncate font-semibold" type="body">
                    {source.title}
                  </Typography>
                  {source.url ? (
                    <Typography className="break-all" color="muted" type="body-xs">
                      {source.url}
                    </Typography>
                  ) : (
                    <Typography color="muted" type="body-xs">
                      No address saved.
                    </Typography>
                  )}
                  {source.description ? (
                    <Typography type="body-sm">{source.description}</Typography>
                  ) : null}
                  <Typography color="muted" type="body-xs">
                    Updated{' '}
                    <time dateTime={source.updatedAt}>{formatUpdatedAt(source.updatedAt)}</time>
                  </Typography>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    isDisabled={!source.url}
                    variant="secondary"
                    onPress={() => void handleOpen(source)}
                  >
                    Open
                  </Button>
                  <Button
                    isDisabled={!source.url}
                    variant="secondary"
                    onPress={() => void handleCopy(source)}
                  >
                    {copiedId === source.id ? 'Copied' : 'Copy address'}
                  </Button>
                  <Button variant="secondary" onPress={() => openEdit(source.id)}>
                    Edit
                  </Button>
                  <Button variant="danger" onPress={() => setTrashTarget(source)}>
                    Trash
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
