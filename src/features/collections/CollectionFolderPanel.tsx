import { useEffect, useState } from 'react'
import { Button, Tooltip, Typography } from '@heroui/react'
import {
  ChevronRightIcon,
  FolderOpenIcon,
  Layers01Icon,
  SidebarLeftIcon,
  StarIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { useNavigate } from 'react-router-dom'

import { listCollections, type Collection } from '../../data/collections'
import { moveItemsToCollection } from '../../data/items'
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

const DROP_TARGET_CLASS = 'outline-2 outline-offset-2 outline-focus'

function collectionIcon(icon: string | null) {
  return (icon ? ICON_COMPONENTS[icon] : undefined) ?? FolderOpenIcon
}

function itemCountLabel(count: number) {
  return count === 1 ? '1 Item' : `${count} Items`
}

const ROW_CLASS =
  'flex w-full items-center gap-3 rounded-2xl bg-default px-3 py-2 text-left transition-colors ease-out hover:bg-default-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

const TILE_CLASS =
  'grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-muted'

const COLLAPSED_ROW_CLASS =
  'size-10 shrink-0 rounded-xl bg-default text-muted hover:bg-default-hover [&_svg]:size-5'

type MoveNotice = { tone: 'ok' | 'error'; text: string }

export function CollectionFolderPanel() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [overId, setOverId] = useState<string | null>(null)
  const [moveNotice, setMoveNotice] = useState<MoveNotice | null>(null)

  useEffect(() => {
    let active = true

    listCollections()
      .then((loaded) => {
        if (active) setCollections(loaded)
      })
      .catch(() => {
        if (active) setCollections(null)
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
      setMoveNotice(null)
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
      setMoveNotice(null)

      try {
        await moveItemsToCollection([detail.itemId], detail.collectionId)
      } catch {
        setMoveNotice({ tone: 'error', text: MOVE_ERROR })
        return
      }

      setMoveNotice({ tone: 'ok', text: target ? `Moved to ${target.name}` : 'Item moved' })

      try {
        setCollections(await listCollections())
      } catch {
        // The move itself succeeded, so the counts the panel has stay.
      }
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
  }, [collections])

  // Empty collections only show up while a drag is active, so they can take a drop.
  const visible = collections?.filter((collection) => isDragging || collection.itemCount > 0) ?? []

  if (!collections || visible.length === 0) return null

  const showExpanded = isOpen || isDragging
  const toggleLabel = showExpanded ? 'Collapse collection folder' : 'Expand collection folder'

  return (
    <aside
      aria-label="Collection folders"
      className={`flex shrink-0 flex-col gap-3 self-stretch rounded-3xl border border-default bg-surface p-4 transition-[width] duration-300 ease-out ${
        showExpanded ? 'w-80' : 'w-[4.5rem]'
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
        <ul className="flex flex-col gap-2">
          {visible.map((collection) => (
            <li
              key={collection.id}
              className={`rounded-2xl ${overId === collection.id ? DROP_TARGET_CLASS : ''}`}
              data-collection-drop={collection.id}
            >
              <button
                aria-label={`Open collection ${collection.name}`}
                className={ROW_CLASS}
                type="button"
                onClick={() => navigate(`/collections?collection=${collection.id}`)}
              >
                <span aria-hidden="true" className={TILE_CLASS}>
                  <HugeiconsIcon
                    icon={collectionIcon(collection.icon)}
                    size={20}
                    strokeWidth={1.75}
                  />
                </span>

                <span className="grid min-w-0 flex-1 gap-0.5">
                  <Typography className="truncate font-semibold" type="body">
                    {collection.name}
                  </Typography>
                  <Typography color="muted" type="body-xs">
                    {itemCountLabel(collection.itemCount)}
                  </Typography>
                </span>

                <HugeiconsIcon
                  aria-hidden="true"
                  className="shrink-0 text-muted"
                  icon={ChevronRightIcon}
                  size={18}
                />
              </button>
            </li>
          ))}
        </ul>
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

      {moveNotice ? (
        <Typography
          className={moveNotice.tone === 'error' ? 'font-semibold text-danger' : undefined}
          color="muted"
          role={moveNotice.tone === 'error' ? 'alert' : 'status'}
          type="body-xs"
        >
          {moveNotice.text}
        </Typography>
      ) : null}
    </aside>
  )
}
