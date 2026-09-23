import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, EmptyState, Skeleton, Typography } from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import PageHeader from '../../app/PageHeader'
import { ItemList, ItemListSkeleton } from '../../components/items/ItemList'
import { listRecentItems, type RecentItems } from '../../data/activity'
import { listCollections, type Collection } from '../../data/collections'
import { loadVaultSummary, type VaultSummary } from '../../data/dashboard'
import { listItems, type ItemSummary } from '../../data/items'
import { QuickAddDialog } from '../quick-add/QuickAddDialog'
import { ItemDetailsDialog } from '../items/ItemDetailsDialog'

type LoadState = 'loading' | 'ready' | 'error'

type InitialAction = 'note' | 'file' | 'source' | 'collection'

const EMPTY_RECENT: RecentItems = { opened: [], modified: [], created: [] }
const panelLabelClass = 'uppercase'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [summary, setSummary] = useState<VaultSummary | null>(null)
  const [recent, setRecent] = useState<RecentItems>(EMPTY_RECENT)
  const [favorites, setFavorites] = useState<ItemSummary[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [initialAction, setInitialAction] = useState<InitialAction | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    Promise.all([
      loadVaultSummary(),
      listRecentItems(),
      listItems({ favorite: true }),
      listCollections(),
    ])
      .then(([loadedSummary, loadedRecent, loadedFavorites, loadedCollections]) => {
        if (!active) return
        setSummary(loadedSummary)
        setRecent(loadedRecent)
        setFavorites(loadedFavorites)
        setCollections(loadedCollections)
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [attempt])

  const recentItems = useMemo(() => {
    const seen = new Set<string>()
    const merged: ItemSummary[] = []

    for (const item of [...recent.opened, ...recent.modified, ...recent.created]) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }

    return merged.slice(0, 5)
  }, [recent])

  function reload() {
    setAttempt((value) => value + 1)
  }

  function openQuickAdd(action: InitialAction | null) {
    setInitialAction(action)
    setQuickAddOpen(true)
  }

  return (
    <section aria-labelledby="dashboard-title" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          description="Your vault at a glance."
          title="Dashboard"
          titleId="dashboard-title"
        />
        <Button onPress={() => openQuickAdd(null)}>Quick Add</Button>
      </div>

      {loadState === 'loading' ? (
        <div
          aria-labelledby="dashboard-loading-title"
          aria-live="polite"
          className="grid gap-8"
          role="status"
        >
          <Typography className="sr-only" id="dashboard-loading-title" type="h2">
            Loading your dashboard
          </Typography>
          <Typography color="muted" type="body">
            Kivo is reading this vault.
          </Typography>

          <div className="grid gap-3">
            <Typography type="h2">Recent</Typography>
            <ItemListSkeleton />
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Favorites</Typography>
            <ItemListSkeleton />
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Collections</Typography>
            <div aria-hidden="true" className="flex flex-wrap gap-3">
              {['w-24', 'w-32', 'w-28', 'w-20', 'w-36', 'w-24'].map((width, index) => (
                <Skeleton
                  key={`${width}-${index}`}
                  className={`h-9 ${width} rounded-full`}
                  animationType="shimmer"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Storage</Typography>
            <Card>
              <Card.Content>
                <dl aria-hidden="true" className="grid gap-2">
                  {[
                    ['w-12', 'w-8'],
                    ['w-14', 'w-8'],
                    ['w-16', 'w-8'],
                    ['w-12', 'w-8'],
                    ['w-16', 'w-8'],
                    ['w-20', 'w-8'],
                    ['w-12', 'w-8'],
                    ['w-28', 'w-12'],
                    ['w-24', 'w-12'],
                  ].map(([labelWidth, valueWidth], index) => (
                    <div key={index} className="flex flex-wrap justify-between gap-2">
                      <Skeleton
                        className={`h-4 ${labelWidth} rounded-md`}
                        animationType="shimmer"
                      />
                      <Skeleton
                        className={`h-4 ${valueWidth} rounded-md`}
                        animationType="shimmer"
                      />
                    </div>
                  ))}
                </dl>
              </Card.Content>
            </Card>
          </div>
        </div>
      ) : null}

      {loadState === 'error' ? (
        <Alert aria-labelledby="dashboard-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="dashboard-error-title" type="h2">
              Your dashboard could not load
            </Typography>
            <Typography type="body">
              Kivo could not read this vault. Try again.
            </Typography>
            <Button className="justify-self-start" variant="secondary" onPress={reload}>
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'ready' && summary ? (
        summary.itemCount === 0 ? (
          <Card aria-labelledby="dashboard-empty-title">
            <Card.Content className="grid gap-4">
              <Typography id="dashboard-empty-title" type="h2">
                Your vault is looking a little empty.
              </Typography>
              <Typography color="muted" type="body">
                Start adding the things that matter to you.
              </Typography>
              <div className="flex flex-wrap gap-3">
                <Button onPress={() => openQuickAdd('note')}>Add Note</Button>
                <Button variant="secondary" onPress={() => openQuickAdd('file')}>
                  Add File
                </Button>
                <Button variant="secondary" onPress={() => openQuickAdd('source')}>
                  Save Link
                </Button>
                <Button variant="secondary" onPress={() => openQuickAdd('collection')}>
                  Create Collection
                </Button>
              </div>
            </Card.Content>
          </Card>
        ) : (
          <div className="grid gap-8">
            <div className="grid gap-3">
              <Typography type="h2">Recent</Typography>
              <ItemList
                emptyTitle="Nothing recent yet."
                items={recentItems}
                view="list"
                onOpen={setOpenItemId}
              />
            </div>

            <div className="grid gap-3">
              <Typography type="h2">Favorites</Typography>
              <ItemList
                emptyTitle="No favorites yet."
                items={favorites.slice(0, 5)}
                view="list"
                onOpen={setOpenItemId}
              />
            </div>

            <div className="grid gap-3">
              <Typography type="h2">Collections</Typography>
              {collections.length === 0 ? (
                <EmptyState className="grid justify-items-start gap-3">
                  <Typography type="h2">No collections yet.</Typography>
                </EmptyState>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {collections.slice(0, 6).map((collection) => (
                    <Button
                      key={collection.id}
                      variant="secondary"
                      onPress={() => navigate(`/items?collection=${collection.id}`)}
                    >
                      {collection.name} ({collection.itemCount})
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <Typography type="h2">Storage</Typography>
              <Card>
                <Card.Content>
                  <dl className="grid gap-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Items</dt>
                      <dd className="m-0 font-bold">{summary.itemCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Notes</dt>
                      <dd className="m-0 font-bold">{summary.noteCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Sources</dt>
                      <dd className="m-0 font-bold">{summary.sourceCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Files</dt>
                      <dd className="m-0 font-bold">{summary.fileCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Favorites</dt>
                      <dd className="m-0 font-bold">{summary.favoriteCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Collections</dt>
                      <dd className="m-0 font-bold">{summary.collectionCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Trash</dt>
                      <dd className="m-0 font-bold">{summary.trashCount}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Managed file bytes</dt>
                      <dd className="m-0 font-bold">{formatBytes(summary.fileBytes)}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted">Database size</dt>
                      <dd className="m-0 font-bold">{formatBytes(summary.databaseBytes)}</dd>
                    </div>
                  </dl>
                </Card.Content>
              </Card>
            </div>
          </div>
        )
      ) : null}

      <ItemDetailsDialog
        itemId={openItemId}
        onChanged={reload}
        onClose={() => setOpenItemId(null)}
      />

      <QuickAddDialog
        initialAction={initialAction}
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />
    </section>
  )
}
