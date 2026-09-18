import { Button, Chip, Dropdown } from '@heroui/react'
import { FilterIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Key } from 'react'

import type { Collection } from '../../data/collections'
import type { ItemKind } from '../../data/items'
import type { Tag } from '../../data/tags'

export type KindFilter = 'all' | ItemKind

export type FilterMenuProps = {
  kind: KindFilter
  collectionId: string | null
  tagId: string | null
  favoritesOnly: boolean
  collections: Collection[]
  tags: Tag[]
  onKindChange: (kind: KindFilter) => void
  onCollectionChange: (id: string | null) => void
  onTagChange: (id: string | null) => void
  onFavoritesChange: (value: boolean) => void
  onClear: () => void
}

export function FilterMenu({
  kind,
  collectionId,
  tagId,
  favoritesOnly,
  collections,
  tags,
  onKindChange,
  onCollectionChange,
  onTagChange,
  onFavoritesChange,
  onClear,
}: FilterMenuProps) {
  const activeCount =
    (kind === 'all' ? 0 : 1) +
    (collectionId ? 1 : 0) +
    (tagId ? 1 : 0) +
    (favoritesOnly ? 1 : 0)

  function handleAction(key: Key) {
    const value = String(key)

    if (value === 'clear') return onClear()
    if (value.startsWith('kind.')) return onKindChange(value.slice(5) as KindFilter)
    if (value === 'collection.all') return onCollectionChange(null)
    if (value.startsWith('collection.')) return onCollectionChange(value.slice(11))
    if (value === 'tag.all') return onTagChange(null)
    if (value.startsWith('tag.')) return onTagChange(value.slice(4))
    if (value === 'fav.all') return onFavoritesChange(false)
    if (value === 'fav.only') return onFavoritesChange(true)
  }

  return (
    <Dropdown>
      <Button aria-label="Filters" variant="secondary">
        <HugeiconsIcon aria-hidden="true" icon={FilterIcon} size={16} />
        Filters
        {activeCount > 0 ? <Chip size="sm" variant="soft">{activeCount}</Chip> : null}
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={handleAction}>
          <Dropdown.SubmenuTrigger>
            <Dropdown.Item id="kind" textValue="Kind">Kind<Dropdown.SubmenuIndicator /></Dropdown.Item>
            <Dropdown.Popover>
              <Dropdown.Menu selectionMode="single" selectedKeys={[`kind.${kind}`]} onAction={handleAction}>
                <Dropdown.Item id="kind.all" textValue="All kinds">All kinds</Dropdown.Item>
                <Dropdown.Item id="kind.note" textValue="Notes">Notes</Dropdown.Item>
                <Dropdown.Item id="kind.source" textValue="Sources">Sources</Dropdown.Item>
                <Dropdown.Item id="kind.file" textValue="Files">Files</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>

          <Dropdown.SubmenuTrigger>
            <Dropdown.Item id="collection" textValue="Collection">
              Collection<Dropdown.SubmenuIndicator />
            </Dropdown.Item>
            <Dropdown.Popover>
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={[collectionId ? `collection.${collectionId}` : 'collection.all']}
                onAction={handleAction}
              >
                <Dropdown.Item id="collection.all" textValue="All collections">All collections</Dropdown.Item>
                {collections.map((collection) => (
                  <Dropdown.Item
                    key={collection.id}
                    id={`collection.${collection.id}`}
                    textValue={collection.name}
                  >
                    {collection.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>

          <Dropdown.SubmenuTrigger>
            <Dropdown.Item id="tag" textValue="Tag">Tag<Dropdown.SubmenuIndicator /></Dropdown.Item>
            <Dropdown.Popover>
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={[tagId ? `tag.${tagId}` : 'tag.all']}
                onAction={handleAction}
              >
                <Dropdown.Item id="tag.all" textValue="All tags">All tags</Dropdown.Item>
                {tags.map((tag) => (
                  <Dropdown.Item key={tag.id} id={`tag.${tag.id}`} textValue={tag.name}>
                    {tag.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>

          <Dropdown.SubmenuTrigger>
            <Dropdown.Item id="fav" textValue="Favorites">
              Favorites<Dropdown.SubmenuIndicator />
            </Dropdown.Item>
            <Dropdown.Popover>
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={[favoritesOnly ? 'fav.only' : 'fav.all']}
                onAction={handleAction}
              >
                <Dropdown.Item id="fav.all" textValue="All items">All items</Dropdown.Item>
                <Dropdown.Item id="fav.only" textValue="Favorites only">Favorites only</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>

          <Dropdown.Item id="clear" textValue="Clear filters" isDisabled={activeCount === 0}>
            Clear filters
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
