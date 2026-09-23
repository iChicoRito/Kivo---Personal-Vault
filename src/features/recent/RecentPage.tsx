import { useEffect, useState } from 'react'
import { Alert, Button, Typography } from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ItemList, ItemListSkeleton } from '../../components/items/ItemList'
import { listRecentItems, type RecentItems } from '../../data/activity'
import { ItemDetailsDialog } from '../items/ItemDetailsDialog'

type LoadState = 'loading' | 'ready' | 'error'

const EMPTY_RECENT: RecentItems = { opened: [], modified: [], created: [] }

const panelLabelClass = 'uppercase'

export function RecentPage() {
  const [recent, setRecent] = useState<RecentItems>(EMPTY_RECENT)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [openItemId, setOpenItemId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    listRecentItems()
      .then((loaded) => {
        if (!active) return
        setRecent(loaded)
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [attempt])

  function reload() {
    setAttempt((value) => value + 1)
  }

  const hasAnyRecent =
    recent.opened.length > 0 || recent.modified.length > 0 || recent.created.length > 0

  return (
    <section aria-labelledby="recent-title" className="grid gap-5">
      <PageHeader
        description="Return to items opened lately."
        title="Recent"
        titleId="recent-title"
      />

      {loadState === 'loading' ? (
        <div
          aria-labelledby="recent-loading-title"
          aria-live="polite"
          className="grid gap-6"
          role="status"
        >
          <Typography className="sr-only" id="recent-loading-title" type="h2">
            Loading recent items
          </Typography>
          <Typography color="muted" type="body">
            Kivo is reading items opened on this device.
          </Typography>

          <div className="grid gap-3">
            <Typography type="h2">Opened</Typography>
            <ItemListSkeleton />
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Modified</Typography>
            <ItemListSkeleton />
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Created</Typography>
            <ItemListSkeleton />
          </div>
        </div>
      ) : null}

      {loadState === 'error' ? (
        <Alert aria-labelledby="recent-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="recent-error-title" type="h2">
              Recent items could not load
            </Typography>
            <Typography type="body">
              Kivo could not read recent items. Try again to reload this list.
            </Typography>
            <Button className="justify-self-start" variant="secondary" onPress={reload}>
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'ready' && !hasAnyRecent ? (
        <ItemList
          emptyDescription="Items you open, change, or create will appear here."
          emptyTitle="Nothing recent yet."
          items={[]}
          view="list"
        />
      ) : null}

      {loadState === 'ready' && hasAnyRecent ? (
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Typography type="h2">Opened</Typography>
            <ItemList items={recent.opened} view="list" onOpen={setOpenItemId} />
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Modified</Typography>
            <ItemList items={recent.modified} view="list" onOpen={setOpenItemId} />
          </div>

          <div className="grid gap-3">
            <Typography type="h2">Created</Typography>
            <ItemList items={recent.created} view="list" onOpen={setOpenItemId} />
          </div>
        </div>
      ) : null}

      <ItemDetailsDialog
        itemId={openItemId}
        onChanged={reload}
        onClose={() => setOpenItemId(null)}
      />
    </section>
  )
}

export default RecentPage
