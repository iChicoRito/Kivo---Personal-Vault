import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Skeleton, Tooltip, Typography } from '@heroui/react'
import {
  FolderOpenIcon,
  Layers01Icon,
  SidebarLeftIcon,
  StarIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { useNavigate } from 'react-router-dom'

import { BranchedMenu, type BranchedMenuChild, type BranchedMenuItem } from '../../components/ui/BranchedMenu'
import { listCollections, type Collection } from '../../data/collections'
import { listItems, moveItemsToCollection, type ItemSummary } from '../../data/items'
import { openItemByKind } from './itemOpen'
import {
  ITEM_DROPPED_EVENT,
  ITEM_DRAG_END_EVENT,
  ITEM_DRAG_OVER_EVENT,
  ITEM_DRAG_START_EVENT,
  type ItemDragOverDetail,
  type ItemDropDetail,
} from './itemDrag'

const ICON_COMPONENTS: Record<string, IconSvgElement> = {
  folder: FolderOpenIcon,
  star: StarIcon,
  tag: Tag01Icon,
  layers: Layers01Icon,
}

const MOVE_ERROR = 'Could not move this item. Try again.'
const OPEN_ERROR = 'Could not open this item. Try again.'
const LOAD_ERROR = 'Could not load these items.'

const DROP_TARGET_CLASS = 'outline-2 outline-offset-2 outline-focus'

/** The tree geometry the Figma frames fix: a trunk near the left edge, one
 * elbow per row, and the child labels a step further in. */
const MENU_INDENT = 48
const MENU_TRUNK = 6
const MENU_ROW_HEIGHT = 32
const MENU_WIDTH = 288

type ItemsEntry = { status: 'loading' | 'ready' | 'error'; items: ItemSummary[] }

type Notice = { tone: 'ok' | 'error'; text: string }

function collectionIcon(icon: string | null) {
  return (icon ? ICON_COMPONENTS[icon] : undefined) ?? FolderOpenIcon
}

function itemCountLabel(count: number) {
  return count === 1 ? '1 Item' : `${count} Items`
}

function itemTitle(item: ItemSummary) {
  return item.title || item.file?.originalName || 'Untitled item'
}

/** Three shimmer bars hold the height of the branch lines while the items of an
 * open collection load. */
function loadingChildren(): BranchedMenuChild[] {
  return [
    { value: 'loading-1', disabled: true, label: <span aria-hidden="true" className="skeleton skeleton--shimmer block h-3 w-24" /> },
    { value: 'loading-2', disabled: true, label: <span aria-hidden="true" className="skeleton skeleton--shimmer block h-3 w-20" /> },
    { value: 'loading-3', disabled: true, label: <span aria-hidden="true" className="skeleton skeleton--shimmer block h-3 w-28" /> },
  ]
}

function CollectionFolderPanelSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex w-80 shrink-0 flex-col gap-3 self-stretch rounded-3xl border border-default bg-surface p-4"
      role="status"
    >
      <span className="sr-only">Loading collection folders</span>
      <div aria-hidden="true" className="grid gap-4">
        <div className="flex items-center justify-between">
          <Skeleton animationType="shimmer" className="h-4 w-28 rounded" />
          <Skeleton animationType="shimmer" className="size-8 rounded-xl" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton animationType="shimmer" className="size-4 shrink-0 rounded" />
            <Skeleton animationType="shimmer" className="h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

const COLLAPSED_ROW_CLASS =
  'size-10 shrink-0 rounded-xl text-muted transition-colors ease-out hover:bg-default hover:text-foreground [&_svg]:size-5'

export function CollectionFolderPanel() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [overId, setOverId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [itemsById, setItemsById] = useState<Record<string, ItemsEntry>>({})
  const inFlight = useRef(new Set<string>())
  const openedFirst = useRef(false)

  const loadItems = useCallback((collectionId: string, refresh = false) => {
    if (refresh) inFlight.current.delete(collectionId)
    if (inFlight.current.has(collectionId)) return

    inFlight.current.add(collectionId)

    setItemsById((current) => {
      // A refresh keeps the rows that are already there, so the tree does not
      // blink back to bars after a drop.
      if (current[collectionId]?.status === 'ready') return current
      return { ...current, [collectionId]: { status: 'loading', items: [] } }
    })

    listItems({ collectionId })
      .then((items) => {
        setItemsById((current) => ({ ...current, [collectionId]: { status: 'ready', items } }))
      })
      .catch(() => {
        setItemsById((current) => ({ ...current, [collectionId]: { status: 'error', items: [] } }))
      })
      .finally(() => {
        inFlight.current.delete(collectionId)
      })
  }, [])

  useEffect(() => {
    let active = true

    listCollections()
      .then((loaded) => {
        if (active) {
          setCollections(loaded)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setCollections(null)
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  // The pages dispatch these events, so the panel needs no props. The drop
  // handler reads the loaded collections to name the collection that took the
  // card, which is why this effect follows them.
  useEffect(() => {
    function handleStart() {
      setIsDragging(true)
      setNotice(null)
    }

    function handleEnd() {
      setIsDragging(false)
      setOverId(null)
    }

    function handleOver(event: Event) {
      setOverId((event as CustomEvent<ItemDragOverDetail>).detail?.collectionId ?? null)
    }

    async function handleDropped(event: Event) {
      const detail = (event as CustomEvent<ItemDropDetail>).detail

      if (!detail) return

      const target = collections?.find((collection) => collection.id === detail.collectionId)

      setOverId(null)
      setNotice(null)

      try {
        await moveItemsToCollection([detail.itemId], detail.collectionId)
      } catch {
        setNotice({ tone: 'error', text: MOVE_ERROR })
        return
      }

      setNotice({ tone: 'ok', text: target ? `Moved to ${target.name}` : 'Item moved' })

      try {
        setCollections(await listCollections())
      } catch {
        // The move itself succeeded, so the collections the panel has stay.
      }

      // The item left one collection and joined another, so every open tree
      // refetches its rows.
      const open = openIds
      for (const id of open) loadItems(id, true)
      if (!open.includes(detail.collectionId)) loadItems(detail.collectionId, true)
    }

    window.addEventListener(ITEM_DRAG_START_EVENT, handleStart)
    window.addEventListener(ITEM_DRAG_END_EVENT, handleEnd)
    window.addEventListener(ITEM_DRAG_OVER_EVENT, handleOver)
    window.addEventListener(ITEM_DROPPED_EVENT, handleDropped)

    return () => {
      window.removeEventListener(ITEM_DRAG_START_EVENT, handleStart)
      window.removeEventListener(ITEM_DRAG_END_EVENT, handleEnd)
      window.removeEventListener(ITEM_DRAG_OVER_EVENT, handleOver)
      window.removeEventListener(ITEM_DROPPED_EVENT, handleDropped)
    }
  }, [collections, openIds, loadItems])

  // Every collection shows, empty or not, so the list never changes shape in
  // the middle of a drag, and an empty folder is always a drop target.
  const visible = collections ?? []

  // The first collection that holds items starts unfolded, so the panel shows
  // its items right away. An empty first collection would unfold on nothing.
  const firstWithItems = visible.findIndex((collection) => collection.itemCount > 0)
  const firstOpenIndex = firstWithItems >= 0 ? firstWithItems : 0

  useEffect(() => {
    if (openedFirst.current) return

    const first = visible[firstOpenIndex]
    if (!first) return

    openedFirst.current = true
    setOpenIds([first.id])
    loadItems(first.id)
  }, [visible, firstOpenIndex, loadItems])

  if (isLoading) return <CollectionFolderPanelSkeleton />
  if (!collections || visible.length === 0) return null

  function handleToggle(index: number, menuIsOpen: boolean) {
    const collection = visible[index]

    if (!collection) return

    if (menuIsOpen) {
      setOpenIds((current) => (current.includes(collection.id) ? current : [...current, collection.id]))
      loadItems(collection.id)
      return
    }

    setOpenIds((current) => current.filter((id) => id !== collection.id))
  }

  async function openItem(item: ItemSummary) {
    setNotice(null)

    try {
      await openItemByKind(item, (id) => navigate(`/notes/${id}`))
    } catch {
      setNotice({ tone: 'error', text: OPEN_ERROR })
    }
  }

  const itemLookup: Record<string, ItemSummary> = {}
  const menuItems: BranchedMenuItem[] = visible.map((collection) => {
    const entry = itemsById[collection.id]
    let children: BranchedMenuChild[]

    if (entry?.status === 'loading') children = loadingChildren()
    else if (entry?.status === 'error') {
      children = [{ value: `${collection.id}-error`, disabled: true, label: LOAD_ERROR }]
    } else {
      children = (entry?.items ?? []).map((item) => {
        itemLookup[item.id] = item
        return { value: item.id, label: itemTitle(item) }
      })
    }

    return {
      value: collection.id,
      ariaLabel: `${collection.name} ${itemCountLabel(collection.itemCount)}`,
      icon: (
        <HugeiconsIcon
          aria-hidden="true"
          icon={collectionIcon(collection.icon)}
          size={18}
          strokeWidth={1.75}
        />
      ),
      label: collection.name,
      className: overId === collection.id ? DROP_TARGET_CLASS : undefined,
      data: { 'data-collection-drop': collection.id },
      children,
    }
  })

  const showExpanded = isOpen || isDragging
  const toggleLabel = showExpanded ? 'Collapse collection folder' : 'Expand collection folder'

  return (
    // The list row measures this wrapper, never the panel itself, so the panel
    // takes the height of the list area beside it and a long tree scrolls
    // inside the panel instead of stretching the page. The floor keeps the
    // panel readable next to a list that is shorter than the tree.
    <div
      className={`relative min-h-96 shrink-0 transition-[width] duration-300 ease-out ${
        showExpanded ? 'w-80' : 'w-16'
      }`}
    >
      <aside
        aria-label="Collection folders"
        className={`absolute inset-0 flex flex-col gap-3 rounded-3xl border border-default bg-surface ${
          showExpanded ? 'p-4' : 'px-2 py-4'
        }`}
      >
        <div
          className={`flex items-center gap-2 ${showExpanded ? 'justify-between' : 'justify-center'}`}
        >
          {showExpanded ? (
            <Typography className="truncate" color="muted" type="body-sm" weight="medium">
              Collection Folder
            </Typography>
          ) : null}

          <Button
            aria-expanded={showExpanded}
            aria-label={toggleLabel}
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => setIsOpen((value) => !value)}
          >
            <HugeiconsIcon aria-hidden="true" icon={SidebarLeftIcon} size={18} />
          </Button>
        </div>

        {showExpanded ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <BranchedMenu
              accentColor="var(--foreground)"
              className="kivo-collection-menu"
              color="var(--foreground)"
              defaultActive=""
              defaultOpen={firstOpenIndex}
              indent={MENU_INDENT}
              items={menuItems}
              lineColor="color-mix(in oklab, var(--foreground) 28%, transparent)"
              rowHeight={MENU_ROW_HEIGHT}
              trunk={MENU_TRUNK}
              width={MENU_WIDTH}
              onSelect={(value) => {
                const item = itemLookup[value]

                if (item) void openItem(item)
              }}
              onToggle={handleToggle}
            />
          </div>
        ) : (
          <ul className="flex flex-col items-center gap-2">
            {visible.map((collection) => (
              <li
                key={collection.id}
                className={`rounded-xl ${overId === collection.id ? DROP_TARGET_CLASS : ''}`}
                data-collection-drop={collection.id}
              >
                <Tooltip.Root>
                  <Button
                    aria-label={`Open collection ${collection.name}`}
                    className={COLLAPSED_ROW_CLASS}
                    isIconOnly
                    variant="ghost"
                    onPress={() => navigate(`/collections?collection=${collection.id}`)}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={collectionIcon(collection.icon)}
                      size={20}
                      strokeWidth={1.75}
                    />
                  </Button>
                  <Tooltip.Content>{collection.name}</Tooltip.Content>
                </Tooltip.Root>
              </li>
            ))}
          </ul>
        )}

        {notice ? (
          <Typography
            className={notice.tone === 'error' ? 'font-semibold text-danger' : undefined}
            color="muted"
            role={notice.tone === 'error' ? 'alert' : 'status'}
            type="body-xs"
          >
            {notice.text}
          </Typography>
        ) : null}
      </aside>
    </div>
  )
}
