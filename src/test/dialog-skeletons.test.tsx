import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const itemsMock = vi.hoisted(() => ({
  listItems: vi.fn(),
  loadItem: vi.fn(),
  saveItem: vi.fn(),
  setItemTags: vi.fn(),
  trashItems: vi.fn(),
}))

const activityMock = vi.hoisted(() => ({ markItemOpened: vi.fn() }))
const filesMock = vi.hoisted(() => ({ openItemFile: vi.fn(), revealItemFile: vi.fn() }))
const collectionsMock = vi.hoisted(() => ({ listCollections: vi.fn() }))
const tagsMock = vi.hoisted(() => ({ listTags: vi.fn() }))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/activity', () => activityMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)

import { NavbarSearch } from '../app/NavbarSearch'
import { CollectionSelect, TagPicker } from '../components/items/dialogs'
import { ItemDetailsDialog } from '../features/items/ItemDetailsDialog'
import { SaveSourceDialog } from '../features/sources/SaveSourceDialog'
import type { Collection } from '../data/collections'
import type { ItemSummary, VaultItem } from '../data/items'
import type { Tag } from '../data/tags'

const ITEM: VaultItem = {
  id: 'item-1',
  kind: 'note',
  title: 'Alpha note',
  description: 'First note',
  content: 'Note content',
  url: null,
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-02T10:00:00Z',
  tags: [],
  file: null,
  fileMissing: false,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([])
  itemsMock.loadItem.mockResolvedValue(ITEM)
  itemsMock.saveItem.mockResolvedValue(ITEM)
  itemsMock.setItemTags.mockResolvedValue([])
  itemsMock.trashItems.mockResolvedValue(undefined)
  activityMock.markItemOpened.mockResolvedValue(undefined)
  filesMock.openItemFile.mockResolvedValue(undefined)
  filesMock.revealItemFile.mockResolvedValue(undefined)
  collectionsMock.listCollections.mockResolvedValue([])
  tagsMock.listTags.mockResolvedValue([])
})

describe('dialog loading skeletons', () => {
  it('shows result-row skeletons while search is pending', () => {
    const request = deferred<ItemSummary[]>()
    itemsMock.listItems.mockReturnValue(request.promise)

    render(<NavbarSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'Search the vault' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'alpha' },
    })

    const status = screen.getByRole('status', { name: 'Searching the vault' })
    expect(status.querySelectorAll('.skeleton')).toHaveLength(12)
  })

  it('shows form skeletons while item details are pending', () => {
    const request = deferred<VaultItem>()
    itemsMock.loadItem.mockReturnValue(request.promise)

    render(<ItemDetailsDialog itemId="item-1" onClose={vi.fn()} onChanged={vi.fn()} />)

    const status = screen.getByRole('status', { name: 'Loading item details' })
    expect(status.querySelectorAll('.skeleton')).toHaveLength(18)
    expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument()
  })

  it('shows source field skeletons while an edit loads', () => {
    const request = deferred<VaultItem>()
    itemsMock.loadItem.mockReturnValue(request.promise)

    render(
      <SaveSourceDialog
        itemId="item-1"
        open
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    const status = screen.getByRole('status', { name: 'Loading source fields' })
    expect(status.querySelectorAll('.skeleton')).toHaveLength(8)
    expect(screen.queryByRole('textbox', { name: 'Address' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows the new-source form after switching away from a pending edit', () => {
    const request = deferred<VaultItem>()
    const onClose = vi.fn()
    const onSaved = vi.fn()
    itemsMock.loadItem.mockReturnValue(request.promise)

    const { rerender } = render(
      <SaveSourceDialog itemId="item-1" open onClose={onClose} onSaved={onSaved} />,
    )

    expect(screen.getByRole('status', { name: 'Loading source fields' })).toBeInTheDocument()

    rerender(<SaveSourceDialog itemId={null} open onClose={onClose} onSaved={onSaved} />)

    expect(screen.getByRole('textbox', { name: 'Address' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading source fields' })).not.toBeInTheDocument()
  })

  it('keeps selected tags actionable while loading remaining tag options', () => {
    tagsMock.listTags.mockReturnValue(deferred<Tag[]>().promise)

    render(<TagPicker label="Tags" value={['already-selected']} onChange={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: 'already-selected' })).toBeChecked()
    expect(screen.getByRole('status', { name: 'Loading tags' })).toBeInTheDocument()
  })

  it('shows tag and collection option skeletons while their lists load', () => {
    const tagRequest = deferred<Tag[]>()
    const collectionRequest = deferred<Collection[]>()
    tagsMock.listTags.mockReturnValue(tagRequest.promise)
    collectionsMock.listCollections.mockReturnValue(collectionRequest.promise)

    render(
      <>
        <TagPicker label="Tags" value={[]} onChange={vi.fn()} />
        <CollectionSelect label="Collection" value={null} onChange={vi.fn()} />
      </>,
    )

    const tagStatus = screen.getByRole('status', { name: 'Loading tags' })
    expect(tagStatus.querySelectorAll('.skeleton').length).toBeGreaterThan(0)

    expect(screen.getByRole('status', { name: 'Loading collections' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Collection$/ }))
    const loadingOption = screen.getByRole('option', { name: 'Loading collections' })
    expect(loadingOption.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })
})
