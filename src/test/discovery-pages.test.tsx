import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Collection } from '../data/collections'
import type { ItemSummary, VaultItem } from '../data/items'

const itemsMock = vi.hoisted(() => ({
  listItems: vi.fn(),
  loadItem: vi.fn(),
  saveItem: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
  moveItemsToCollection: vi.fn(),
  trashItems: vi.fn(),
  restoreItems: vi.fn(),
  deleteItemsPermanently: vi.fn(),
  importFile: vi.fn(),
  setItemTags: vi.fn(),
}))

const filesMock = vi.hoisted(() => ({
  pickFile: vi.fn(),
  openItemFile: vi.fn(),
  revealItemFile: vi.fn(),
  openSourceUrl: vi.fn(),
}))

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
  saveCollection: vi.fn(),
  deleteCollection: vi.fn(),
}))

const tagsMock = vi.hoisted(() => ({
  listTags: vi.fn(),
  saveTag: vi.fn(),
  deleteTag: vi.fn(),
}))

const activityMock = vi.hoisted(() => ({
  listRecentItems: vi.fn(),
  listActivity: vi.fn(),
  listIndexState: vi.fn(),
  markItemOpened: vi.fn(),
}))

const dashboardMock = vi.hoisted(() => ({
  loadVaultSummary: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/activity', () => activityMock)
vi.mock('../data/dashboard', () => dashboardMock)

import { AppRoutes } from '../app/router'

const SEARCH_NOTE: ItemSummary = {
  id: 'search-1',
  kind: 'note',
  title: 'Alpha note',
  isFavorite: false,
  collectionId: null,
  updatedAt: '2026-01-02T10:00:00Z',
  fileMissing: false,
  isPinned: false,
  file: null,
}

const SEARCH_NOTE_ITEM: VaultItem = {
  id: SEARCH_NOTE.id,
  kind: 'note',
  title: SEARCH_NOTE.title,
  description: 'A note found by search',
  content: 'Body text',
  url: null,
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: SEARCH_NOTE.updatedAt,
  tags: [],
  file: null,
  fileMissing: false,
}

const FAVORITE_NOTE: ItemSummary = {
  ...SEARCH_NOTE,
  id: 'fav-1',
  title: 'Starred note',
  isFavorite: true,
}

const RECENT_OPENED: ItemSummary = {
  ...SEARCH_NOTE,
  id: 'recent-open-1',
  title: 'Opened note',
}

const RECENT_MODIFIED: ItemSummary = {
  ...SEARCH_NOTE,
  id: 'recent-mod-1',
  title: 'Modified note',
}

const RECENT_CREATED: ItemSummary = {
  ...SEARCH_NOTE,
  id: 'recent-new-1',
  title: 'Created note',
}

const COLLECTION: Collection = {
  id: 'col-1',
  name: 'Work',
  icon: null,
  sortOrder: 0,
  createdAt: '2026-09-10T11:20:00.000Z',
  itemCount: 3,
}

const EMPTY_SUMMARY = {
  itemCount: 0,
  noteCount: 0,
  sourceCount: 0,
  fileCount: 0,
  favoriteCount: 0,
  collectionCount: 0,
  tagCount: 0,
  trashCount: 0,
  fileBytes: 0,
  databaseBytes: 0,
}

const POPULATED_SUMMARY = {
  itemCount: 42,
  noteCount: 7,
  sourceCount: 5,
  fileCount: 3,
  favoriteCount: 2,
  collectionCount: 1,
  tagCount: 6,
  trashCount: 4,
  fileBytes: 2048,
  databaseBytes: 1_048_576,
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

// The type picker opens a HeroUI Select popover. React Aria names the trigger after
// its current value, so match the default "All types" label. Drive the popover with
// plain clicks so the page's onSelectionChange wiring stays under test.
async function chooseItemType(label: string) {
  fireEvent.click(screen.getByRole('button', { name: /All types/ }))
  fireEvent.click(await screen.findByRole('option', { name: label }))
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([])
  itemsMock.loadItem.mockResolvedValue(undefined)
  itemsMock.saveItem.mockResolvedValue(undefined)
  itemsMock.setItemPinned.mockResolvedValue(undefined)
  itemsMock.setItemsFavorite.mockResolvedValue(undefined)
  itemsMock.moveItemsToCollection.mockResolvedValue(undefined)
  itemsMock.trashItems.mockResolvedValue(undefined)
  itemsMock.restoreItems.mockResolvedValue(undefined)
  itemsMock.deleteItemsPermanently.mockResolvedValue(undefined)
  itemsMock.importFile.mockResolvedValue(undefined)
  itemsMock.setItemTags.mockResolvedValue([])
  filesMock.pickFile.mockResolvedValue(null)
  filesMock.openItemFile.mockResolvedValue(undefined)
  filesMock.revealItemFile.mockResolvedValue(undefined)
  filesMock.openSourceUrl.mockResolvedValue(undefined)
  collectionsMock.listCollections.mockResolvedValue([])
  collectionsMock.saveCollection.mockResolvedValue(undefined)
  collectionsMock.deleteCollection.mockResolvedValue(undefined)
  tagsMock.listTags.mockResolvedValue([])
  tagsMock.saveTag.mockResolvedValue(undefined)
  tagsMock.deleteTag.mockResolvedValue(undefined)
  activityMock.listRecentItems.mockResolvedValue({ opened: [], modified: [], created: [] })
  activityMock.markItemOpened.mockResolvedValue(undefined)
  dashboardMock.loadVaultSummary.mockResolvedValue({ ...EMPTY_SUMMARY })
})

describe('SearchPage', () => {
  it('loads results for a typed query and opens an item', async () => {
    itemsMock.listItems.mockResolvedValue([SEARCH_NOTE])
    itemsMock.loadItem.mockResolvedValue({ ...SEARCH_NOTE_ITEM })

    renderRoute('/search')

    fireEvent.change(await screen.findByRole('textbox', { name: 'Search the vault' }), {
      target: { value: 'alpha' },
    })

    await waitFor(() => expect(itemsMock.listItems).toHaveBeenLastCalledWith({ query: 'alpha' }))
    expect(await screen.findByText('Alpha note')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Alpha note/ }))

    expect(await screen.findByRole('heading', { name: 'Item details' })).toBeInTheDocument()
    expect(itemsMock.loadItem).toHaveBeenCalledWith(SEARCH_NOTE.id)
  })

  it('adds the selected type to the query filter', async () => {
    itemsMock.listItems.mockResolvedValue([SEARCH_NOTE])

    renderRoute('/search')

    fireEvent.change(await screen.findByRole('textbox', { name: 'Search the vault' }), {
      target: { value: 'alpha' },
    })
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenLastCalledWith({ query: 'alpha' }))

    await chooseItemType('Notes')

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenLastCalledWith({ query: 'alpha', kind: 'note' }),
    )
  })

  it('shows the empty prompt before a query is typed', async () => {
    renderRoute('/search')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Search your vault.', exact: true }),
    ).toBeInTheDocument()
    expect(itemsMock.listItems).not.toHaveBeenCalled()
  })

  it('shows no matches when the query returns nothing', async () => {
    itemsMock.listItems.mockResolvedValue([])

    renderRoute('/search')

    fireEvent.change(await screen.findByRole('textbox', { name: 'Search the vault' }), {
      target: { value: 'zzz' },
    })

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No matches.', exact: true }),
    ).toBeInTheDocument()
  })
})

describe('FavoritesPage', () => {
  it('renders favorite items from the favorite filter', async () => {
    itemsMock.listItems.mockResolvedValue([FAVORITE_NOTE])

    renderRoute('/favorites')

    expect(await screen.findByText('Starred note')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledWith({ favorite: true })
  })

  it('adds the selected kind to the favorite filter', async () => {
    itemsMock.listItems.mockResolvedValue([FAVORITE_NOTE])

    renderRoute('/favorites')
    await screen.findByText('Starred note')

    await chooseItemType('Notes')

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenLastCalledWith({ favorite: true, kind: 'note' }),
    )
  })

  it('unfavorites an item and reloads the list', async () => {
    itemsMock.listItems.mockResolvedValue([FAVORITE_NOTE])

    renderRoute('/favorites')
    await screen.findByText('Starred note')

    itemsMock.listItems.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Starred note' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove favorite' }))

    await waitFor(() => expect(itemsMock.setItemsFavorite).toHaveBeenCalledWith([FAVORITE_NOTE.id], false))
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Starred note')).toBeInTheDocument()
  })
})

describe('RecentPage', () => {
  it('renders the Opened, Modified, and Created groups with their items', async () => {
    activityMock.listRecentItems.mockResolvedValue({
      opened: [RECENT_OPENED],
      modified: [RECENT_MODIFIED],
      created: [RECENT_CREATED],
    })

    renderRoute('/recent')

    expect(await screen.findByRole('heading', { level: 2, name: 'Opened' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Modified' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Created' })).toBeInTheDocument()

    expect(screen.getByText('Opened note')).toBeInTheDocument()
    expect(screen.getByText('Modified note')).toBeInTheDocument()
    expect(screen.getByText('Created note')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is recent', async () => {
    renderRoute('/recent')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Nothing recent yet.', exact: true }),
    ).toBeInTheDocument()
  })
})

describe('DashboardPage', () => {
  it('shows the Recent, Favorites, Collections, and Storage sections for a populated vault', async () => {
    dashboardMock.loadVaultSummary.mockResolvedValue({ ...POPULATED_SUMMARY })
    activityMock.listRecentItems.mockResolvedValue({
      opened: [RECENT_OPENED],
      modified: [],
      created: [],
    })
    itemsMock.listItems.mockResolvedValue([FAVORITE_NOTE])
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderRoute('/dashboard')

    expect(await screen.findByRole('heading', { level: 2, name: 'Recent' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Favorites' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Collections' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Storage' })).toBeInTheDocument()

    expect(screen.getByText('Opened note')).toBeInTheDocument()
    expect(screen.getByText('Starred note')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Work (3)' })).toBeInTheDocument()

    expect(screen.getByText('Items')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
    expect(screen.getByText('1 MB')).toBeInTheDocument()
  })

  it('shows the empty vault message and the four start actions for an empty vault', async () => {
    renderRoute('/dashboard')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Your vault is looking a little empty.',
        exact: true,
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Add Note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add File' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Collection' })).toBeInTheDocument()
  })

  it('starts the note flow from the empty vault action', async () => {
    itemsMock.saveItem.mockResolvedValue({
      ...SEARCH_NOTE_ITEM,
      id: 'start-note-1',
      title: 'Untitled note',
    })
    itemsMock.loadItem.mockResolvedValue({
      ...SEARCH_NOTE_ITEM,
      id: 'start-note-1',
      title: 'Untitled note',
    })

    renderRoute('/dashboard')

    fireEvent.click(await screen.findByRole('button', { name: 'Add Note' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith({ kind: 'note', title: 'Untitled note' }),
    )
    expect(await screen.findByDisplayValue('Untitled note')).toBeInTheDocument()
  })

  it('opens a collection shortcut with its filter in All Items', async () => {
    dashboardMock.loadVaultSummary.mockResolvedValue({ ...POPULATED_SUMMARY })
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderRoute('/dashboard')

    fireEvent.click(await screen.findByRole('button', { name: 'Work (3)' }))

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith({ collectionId: COLLECTION.id }),
    )
    expect(await screen.findByRole('heading', { name: 'All Items' })).toBeInTheDocument()
  })
})
