import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  ListBox,
  Select,
  Spinner,
  Typography,
} from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ItemTable } from '../../components/items/ItemTable'
import {
  listItems,
  setItemsFavorite,
  type ItemKind,
  type ItemSummary,
} from '../../data/items'
import { ItemDetailsDialog } from '../items/ItemDetailsDialog'

type LoadState = 'loading' | 'ready' | 'error'

type Kind = 'all' | ItemKind

const PAGE_SIZE = 10
const panelLabelClass = 'uppercase'

function KindSelect({ value, onChange }: { value: Kind; onChange: (kind: Kind) => void }) {
  return (
    <Select
      aria-label="Item type"
      className="w-44"
      selectedKey={value}
      variant="secondary"
      onSelectionChange={(key) => onChange(String(key ?? 'all') as Kind)}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="all" textValue="All types">
            All types
          </ListBox.Item>
          <ListBox.Item id="note" textValue="Notes">
            Notes
          </ListBox.Item>
          <ListBox.Item id="source" textValue="Sources">
            Sources
          </ListBox.Item>
          <ListBox.Item id="file" textValue="Files">
            Files
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

export function FavoritesPage() {
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [kind, setKind] = useState<Kind>('all')
  const [page, setPage] = useState(1)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    listItems(kind === 'all' ? { favorite: true } : { favorite: true, kind })
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
  }, [attempt, kind])

  useEffect(() => {
    setPage(1)
  }, [kind])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function reload() {
    setAttempt((value) => value + 1)
  }

  async function handleToggleFavorite(id: string, next: boolean) {
    setActionError(null)

    try {
      await setItemsFavorite([id], next)
      reload()
    } catch {
      setActionError('Kivo could not update this favorite. Your items are unchanged. Try again.')
    }
  }

  return (
    <section aria-labelledby="favorites-title" className="grid gap-5">
      <PageHeader
        description="Keep priority items easy to find."
        title="Favorites"
        titleId="favorites-title"
      />

      <div className="flex flex-wrap items-end gap-3">
        <KindSelect value={kind} onChange={setKind} />
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
        <Card aria-labelledby="favorites-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
            </div>
            <Typography id="favorites-loading-title" type="h2">
              Loading your favorites
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading favorites marked in this vault.
            </Typography>
          </Card.Content>
        </Card>
      ) : null}

      {loadState === 'error' ? (
        <Alert aria-labelledby="favorites-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="favorites-error-title" type="h2">
              Your favorites could not load
            </Typography>
            <Typography type="body">
              Kivo could not read favorite items. Try again to reload this list.
            </Typography>
            <Button className="justify-self-start" variant="secondary" onPress={reload}>
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'ready' ? (
        <ItemTable
          emptyMessage="No favorites yet. Items marked as favorites will appear here."
          items={pagedItems}
          page={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={items.length}
          onOpen={setOpenItemId}
          onPageChange={setPage}
          onToggleFavorite={(id, next) => {
            void handleToggleFavorite(id, next)
          }}
        />
      ) : null}

      <ItemDetailsDialog
        itemId={openItemId}
        onChanged={reload}
        onClose={() => setOpenItemId(null)}
      />
    </section>
  )
}

export default FavoritesPage
