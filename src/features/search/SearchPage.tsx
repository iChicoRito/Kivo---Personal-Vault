import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { ItemList } from '../../components/items/ItemList'
import { listItems, type ItemFilter, type ItemKind, type ItemSummary } from '../../data/items'
import { ItemDetailsDialog } from '../items/ItemDetailsDialog'

type LoadState = 'loading' | 'ready' | 'error'

type Kind = 'all' | ItemKind

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

export function SearchPage() {
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('ready')
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [openItemId, setOpenItemId] = useState<string | null>(null)

  const trimmedQuery = query.trim()

  useEffect(() => {
    if (!trimmedQuery) {
      setItems([])
      setLoadState('ready')
      return
    }

    let active = true
    setLoadState('loading')

    const filter: ItemFilter = { query: trimmedQuery }
    if (kind !== 'all') filter.kind = kind

    listItems(filter)
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
  }, [attempt, trimmedQuery, kind])

  function reload() {
    setAttempt((value) => value + 1)
  }

  return (
    <section aria-labelledby="search-title" className="grid gap-5">
      <PageHeader
        description="Find anything in your vault."
        title="Search"
        titleId="search-title"
      />

      <div className="flex flex-wrap items-end gap-3">
        <TextField className="w-full max-w-sm" value={query} onChange={setQuery}>
          <Label>Search the vault</Label>
          <Input
            fullWidth
            placeholder="Search by title, note text, tag, or collection"
            variant="secondary"
          />
        </TextField>

        <KindSelect value={kind} onChange={setKind} />
      </div>

      {loadState === 'loading' && trimmedQuery ? (
        <Card aria-labelledby="search-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true">
                <Spinner size="sm" />
              </span>
              <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
                LOADING
              </Typography>
            </div>
            <Typography id="search-loading-title" type="h2">
              Loading your search
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading this vault.
            </Typography>
          </Card.Content>
        </Card>
      ) : null}

      {loadState === 'error' ? (
        <Alert aria-labelledby="search-error-title" role="alert" status="danger">
          <Alert.Content className="grid gap-3">
            <Typography className={panelLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="search-error-title" type="h2">
              Your search could not run
            </Typography>
            <Typography type="body">
              Kivo could not read this vault. Try again.
            </Typography>
            <Button
              className="justify-self-start"
              variant="secondary"
              onPress={reload}
            >
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}

      {loadState === 'ready' && !trimmedQuery ? (
        <ItemList
          emptyDescription="Type a word to find notes, sources, files, tags, and collections."
          emptyTitle="Search your vault."
          items={[]}
          view="list"
        />
      ) : null}

      {loadState === 'ready' && trimmedQuery ? (
        <ItemList
          emptyDescription="Try a different word, tag, or collection name."
          emptyTitle="No matches."
          items={items}
          view="list"
          onOpen={setOpenItemId}
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

export default SearchPage
