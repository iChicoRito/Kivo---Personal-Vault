import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Kbd,
  Label,
  Modal,
  Skeleton,
  TextField,
  Typography,
} from '@heroui/react'
import { FolderOpenIcon, Link02Icon, NoteEditIcon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

import { listItems, type ItemKind, type ItemSummary } from '../data/items'
import { ItemDetailsDialog } from '../features/items/ItemDetailsDialog'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const KIND_LABELS: Record<ItemKind, string> = {
  note: 'Note',
  source: 'Source',
  file: 'File',
}

const KIND_ICONS: Record<ItemKind, IconSvgElement> = {
  note: NoteEditIcon,
  source: Link02Icon,
  file: FolderOpenIcon,
}

const RESULT_LIMIT = 8

export function NavbarSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<ItemSummary[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [attempt, setAttempt] = useState(0)
  const [openItemId, setOpenItemId] = useState<string | null>(null)

  const trimmedQuery = query.trim()

  // Ctrl+K (Cmd+K on macOS) opens the dialog from anywhere in the window. The
  // hint badge shows the key; the palette planned for Phase 5 will decide later
  // whether it wants the same keys.
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!trimmedQuery) {
      setItems([])
      setLoadState('idle')
      return
    }

    let active = true
    setLoadState('loading')

    listItems({ query: trimmedQuery })
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
  }, [attempt, trimmedQuery])

  function closeSearch() {
    setIsOpen(false)
    setQuery('')
    setItems([])
    setLoadState('idle')
  }

  function openItem(id: string) {
    setOpenItemId(id)
    closeSearch()
  }

  const visibleItems = items.slice(0, RESULT_LIMIT)
  const hasMore = items.length > RESULT_LIMIT

  return (
    <div className="min-w-0 max-w-[520px] flex-1">
      {/* The navbar field is only a launcher; typing happens in the dialog. */}
      <button
        aria-haspopup="dialog"
        aria-label="Search the vault"
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-(--field-radius) bg-(--default) px-3 text-left text-sm text-muted transition-colors hover:bg-(--default-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <HugeiconsIcon aria-hidden="true" icon={Search01Icon} size={16} strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate">Search the vault</span>
        <Kbd>
          <Kbd.Abbr keyValue="ctrl" />
          <Kbd.Content>K</Kbd.Content>
        </Kbd>
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeSearch()
        }}
      >
        <Modal.Backdrop variant="blur">
          <Modal.Container placement="center" size="lg">
            <Modal.Dialog>
              <Modal.Header className="gap-1">
                <Modal.Heading>Search the vault</Modal.Heading>
                <Typography color="muted" type="body-xs">
                  Find notes, sources, and files by title, tag, or collection.
                </Typography>
              </Modal.Header>

              <Modal.Body className="grid gap-3">
                <TextField className="w-full" value={query} onChange={setQuery}>
                  <Label className="sr-only">Search</Label>
                  <Input autoFocus fullWidth placeholder="Search the vault" variant="secondary" />
                </TextField>

                {loadState === 'loading' ? (
                  <div
                    aria-label="Searching the vault"
                    aria-live="polite"
                    className="grid gap-2 px-1 py-2"
                    role="status"
                  >
                    <span className="sr-only">Searching the vault...</span>
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={index}
                        aria-hidden="true"
                        className="flex min-w-0 items-center gap-3 rounded-[calc(var(--radius)*2)] px-2 py-1.5"
                      >
                        <Skeleton className="size-8 shrink-0 rounded-(--radius)" />
                        <div className="grid min-w-0 flex-1 gap-2">
                          <Skeleton className="h-4 w-3/5" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {loadState === 'error' ? (
                  <div className="grid justify-items-start gap-2 px-1 py-2">
                    <Typography type="body-xs">Your search could not run. Try again.</Typography>
                    <Button variant="secondary" onPress={() => setAttempt((value) => value + 1)}>
                      Try again
                    </Button>
                  </div>
                ) : null}

                {loadState === 'ready' && items.length === 0 ? (
                  <div className="grid gap-1 px-1 py-2">
                    <Typography type="body" weight="semibold">
                      No matches.
                    </Typography>
                    <Typography color="muted" type="body-xs">
                      Try a different word, tag, or collection name.
                    </Typography>
                  </div>
                ) : null}

                {loadState === 'ready' && visibleItems.length > 0 ? (
                  <ul aria-label="Search results" className="grid gap-1">
                    {visibleItems.map((item) => (
                      <li key={item.id} className="min-w-0">
                        <button
                          className="flex w-full min-w-0 items-center gap-3 rounded-[calc(var(--radius)*2)] px-2 py-1.5 text-left hover:bg-(--default) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          type="button"
                          onClick={() => openItem(item.id)}
                        >
                          <HugeiconsIcon
                            aria-hidden="true"
                            className="shrink-0 text-muted"
                            icon={KIND_ICONS[item.kind]}
                            size={16}
                            strokeWidth={1.75}
                          />
                          <Typography className="min-w-0 flex-1 truncate" type="body">
                            {item.title}
                          </Typography>
                          <Typography color="muted" type="body-xs">
                            {KIND_LABELS[item.kind]}
                          </Typography>
                        </button>
                      </li>
                    ))}
                    {hasMore ? (
                      <li className="px-2 py-1">
                        <Typography color="muted" type="body-xs">
                          Showing first {RESULT_LIMIT} of {items.length} matches.
                        </Typography>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ItemDetailsDialog
        itemId={openItemId}
        onChanged={() => setAttempt((value) => value + 1)}
        onClose={() => setOpenItemId(null)}
      />
    </div>
  )
}

export default NavbarSearch
