import { useEffect, useState } from 'react'
import { Alert, Button, Card, Spinner, Typography } from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ConfirmDialog } from '../../components/items/dialogs'
import { ItemTable } from '../../components/items/ItemTable'
import {
  deleteItemsPermanently,
  listItems,
  restoreItems,
  type ItemSummary,
} from '../../data/items'

type LoadState = 'loading' | 'ready' | 'error'

const PAGE_SIZE = 50
const panelLabelClass = 'uppercase'
const ACTION_ERROR =
  'Kivo could not finish that action. The Trash is unchanged. Try again.'

export function TrashPage() {
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [emptyOpen, setEmptyOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    listItems({ trashed: true })
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
  }, [attempt])

  function reload() {
    setAttempt((value) => value + 1)
  }

  async function runAction(action: () => Promise<void>) {
    setActionError(null)

    try {
      await action()
    } catch {
      setActionError(ACTION_ERROR)
    }
  }

  async function handleRestore(id: string) {
    await runAction(async () => {
      await restoreItems([id])
      reload()
    })
  }

  async function handleDeletePermanently() {
    if (deleteTarget === null) return

    const id = deleteTarget

    await runAction(async () => {
      await deleteItemsPermanently([id])
      setDeleteTarget(null)
      reload()
    })
  }

  async function handleEmptyTrash() {
    const ids = items.map((item) => item.id)

    await runAction(async () => {
      await deleteItemsPermanently(ids)
      setEmptyOpen(false)
      reload()
    })
  }

  return (
    <section aria-labelledby="trash-title" className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          description="Review deleted items before permanent removal."
          title="Trash"
          titleId="trash-title"
        />
        <Button
          isDisabled={items.length === 0}
          variant="danger"
          onPress={() => setEmptyOpen(true)}
        >
          Empty Trash
        </Button>
      </div>

      {actionError ? (
        <Alert role="alert" status="danger">
          <Alert.Content className="grid gap-2">
            <Typography className="font-semibold text-danger" type="body">
              {actionError}
            </Typography>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'loading' ? (
        <Card aria-labelledby="trash-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
            </div>
            <Typography id="trash-loading-title" type="h2">
              Loading trash
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading items waiting in trash.
            </Typography>
          </Card.Content>
        </Card>
      ) : null}

      {loadState === 'error' ? (
        <Alert aria-labelledby="trash-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="trash-error-title" type="h2">
              Trash could not load
            </Typography>
            <Typography type="body">
              Kivo could not read items in trash. Try again to reload this list.
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

      {loadState === 'ready' ? (
        <ItemTable
          emptyMessage="Trash is empty."
          items={items}
          page={1}
          pageSize={PAGE_SIZE}
          totalItems={items.length}
          onDeletePermanently={setDeleteTarget}
          onPageChange={() => undefined}
          onRestore={(id) => {
            void handleRestore(id)
          }}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete permanently"
        description="This cannot be undone. The item and its managed file, when present, are removed from this device."
        open={deleteTarget !== null}
        title="Permanently delete this item?"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeletePermanently()}
      />

      <ConfirmDialog
        confirmLabel="Empty Trash"
        description="All items in Trash are permanently deleted. This cannot be undone. Managed files are removed from this device."
        open={emptyOpen}
        title="Empty Trash?"
        tone="danger"
        onCancel={() => setEmptyOpen(false)}
        onConfirm={() => void handleEmptyTrash()}
      />
    </section>
  )
}

export default TrashPage
