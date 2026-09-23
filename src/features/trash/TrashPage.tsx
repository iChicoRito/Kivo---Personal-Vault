import { useEffect, useState } from 'react'
import { Alert, Button, Typography } from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ConfirmDialog } from '../../components/items/dialogs'
import { ItemTable, ItemTableSkeleton } from '../../components/items/ItemTable'
import {
  deleteItemsPermanently,
  listItems,
  restoreItems,
  type ItemSummary,
} from '../../data/items'
import { notifyError, notifySuccess } from '../../lib/feedback'
import { useVaultChanged } from '../../lib/useVaultChanged'

type LoadState = 'loading' | 'ready' | 'error'

const PAGE_SIZE = 50
const panelLabelClass = 'uppercase'

export function TrashPage() {
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [emptyOpen, setEmptyOpen] = useState(false)

  useVaultChanged(() => setAttempt((value) => value + 1))

  useEffect(() => {
    let active = true
    setLoadState((state) => (state === 'ready' ? state : 'loading'))

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

  async function runAction(
    action: () => Promise<void>,
    successMessage: string,
    failureMessage: string,
  ) {
    try {
      await action()
      notifySuccess(successMessage)
    } catch {
      notifyError(failureMessage)
    }
  }

  async function handleRestore(id: string) {
    await runAction(
      async () => {
        await restoreItems([id])
        reload()
      },
      'Restored from Trash',
      'Kivo could not restore this item. Try again.',
    )
  }

  async function handleDeletePermanently() {
    if (deleteTarget === null) return

    const id = deleteTarget

    await runAction(
      async () => {
        await deleteItemsPermanently([id])
        setDeleteTarget(null)
        reload()
      },
      'Deleted forever',
      'Kivo could not delete this item. Try again.',
    )
  }

  async function handleEmptyTrash() {
    const ids = items.map((item) => item.id)

    await runAction(
      async () => {
        await deleteItemsPermanently(ids)
        setEmptyOpen(false)
        reload()
      },
      'Trash emptied',
      'Kivo could not empty the Trash. Try again.',
    )
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

      {loadState === 'loading' ? (
        <ItemTableSkeleton label="Loading trash" />
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
