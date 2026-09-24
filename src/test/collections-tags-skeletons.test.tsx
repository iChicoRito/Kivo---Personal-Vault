import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Collection } from '../data/collections'
import type { ItemSummary } from '../data/items'

const mocks = vi.hoisted(() => ({
  deleteCollection: vi.fn(),
  listCollections: vi.fn(),
  listItems: vi.fn(),
  loadItem: vi.fn(),
  moveItemsToCollection: vi.fn(),
  openItemFile: vi.fn(),
  openSourceUrl: vi.fn(),
  revealItemFile: vi.fn(),
  saveCollection: vi.fn(),
  trashItems: vi.fn(),
  verifyCollectionSecret: vi.fn(),
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
}))

vi.mock('../data/collections', () => ({
  deleteCollection: mocks.deleteCollection,
  listCollections: mocks.listCollections,
  saveCollection: mocks.saveCollection,
  verifyCollectionSecret: mocks.verifyCollectionSecret,
}))
vi.mock('../data/items', () => ({
  listItems: mocks.listItems,
  loadItem: mocks.loadItem,
  moveItemsToCollection: mocks.moveItemsToCollection,
  trashItems: mocks.trashItems,
}))
vi.mock('../data/files', () => ({
  openItemFile: mocks.openItemFile,
  openSourceUrl: mocks.openSourceUrl,
  revealItemFile: mocks.revealItemFile,
}))
vi.mock('../data/settings', () => ({
  loadPreferences: mocks.loadPreferences,
  savePreferences: mocks.savePreferences,
}))

import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'
import { CollectionsPage } from '../features/collections/CollectionsPage'

const COLLECTION: Collection = {
  id: 'collection-1',
  name: 'Projects',
  icon: 'folder',
  protection: 'none',
  sortOrder: 0,
  createdAt: '2026-09-10T11:20:00.000Z',
  itemCount: 0,
}

const SOURCE_ITEM: ItemSummary = {
  id: 'source-1',
  kind: 'source',
  title: 'Kivo reference',
  isFavorite: false,
  collectionId: COLLECTION.id,
  updatedAt: '2026-09-10T11:20:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: null,
  content: null,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function renderCollections() {
  return render(
    <MemoryRouter>
      <PreferencesProvider initialPreferences={DEFAULT_PREFERENCES}>
        <CollectionsPage />
      </PreferencesProvider>
    </MemoryRouter>,
  )
}

function expectLoadingSkeleton(label: string) {
  const status = screen.getByRole('status')
  const skeletons = status.querySelectorAll('.skeleton')

  expect(status).toHaveTextContent(label)
  expect(skeletons.length).toBeGreaterThan(0)
  expect([...skeletons].every((skeleton) => skeleton.closest('[aria-hidden="true"]'))).toBe(true)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.listCollections.mockResolvedValue([])
  mocks.listItems.mockResolvedValue([])
})

describe('collections loading skeletons', () => {
  it('shows folder-grid skeletons while collections load, then shows folders', async () => {
    const request = deferred<Collection[]>()
    mocks.listCollections.mockReturnValue(request.promise)

    const { container } = renderCollections()

    expectLoadingSkeleton('Loading your collections')
    expect(screen.getByRole('button', { name: 'New collection' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search collection' })).toBeInTheDocument()
    expect(container.querySelector('ul')).toBeInTheDocument()

    await act(async () => request.resolve([COLLECTION]))

    expect(
      await screen.findByRole('button', { name: 'Open collection Projects' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows collection-row skeletons while the list view loads', async () => {
    mocks.listCollections.mockReturnValue(new Promise<Collection[]>(() => {}))

    const { container } = renderCollections()
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'List' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expectLoadingSkeleton('Loading your collections')
    expect(container.querySelector('ul')).toBeInTheDocument()
    const skeletonList = container.querySelector('ul[aria-hidden="true"]')
    expect(skeletonList?.closest('[data-slot="scroll-shadow"]')).not.toBeNull()
  })

  it('shows item-list skeletons while a collection opens, then its empty state', async () => {
    mocks.listCollections.mockResolvedValue([COLLECTION])
    const request = deferred<ItemSummary[]>()
    mocks.listItems.mockReturnValue(request.promise)

    const { container } = renderCollections()
    fireEvent.click(await screen.findByRole('button', { name: 'Open collection Projects' }))

    expectLoadingSkeleton('Loading items in this collection')
    const skeletonList = container.querySelector('ul[aria-hidden="true"]')
    expect(skeletonList?.closest('[data-slot="scroll-shadow"]')).not.toBeNull()

    await act(async () => request.resolve([]))

    expect(await screen.findByText('No items in this collection.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows source fallback text when loading source details fails', async () => {
    mocks.listCollections.mockResolvedValue([{ ...COLLECTION, itemCount: 1 }])
    mocks.listItems.mockResolvedValue([SOURCE_ITEM])
    mocks.loadItem.mockRejectedValue(new Error('Source detail unavailable'))

    renderCollections()
    fireEvent.click(await screen.findByRole('button', { name: 'Open collection Projects' }))

    expect(await screen.findByText('No address saved.')).toBeInTheDocument()
  })
})
