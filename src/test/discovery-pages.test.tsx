import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  pickFiles: vi.fn(),
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
}))

const dashboardMock = vi.hoisted(() => ({
  loadVaultSummary: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)
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
  content: null,
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

const COLLECTION: Collection = {
  id: 'col-1',
  name: 'Work',
  icon: null,
  protection: 'none',
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

// Rows open their action menu on a right click. A title can repeat on the page,
// so pick the first match that sits inside an item card.
function openRowMenu(title: string) {
  const titleElement = screen
    .getAllByText(title)
    .find((element) => element.closest('.kivo-item-card') !== null)

  if (!titleElement) throw new Error(`The row for "${title}" is missing.`)

  fireEvent.contextMenu(titleElement)
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
  dashboardMock.loadVaultSummary.mockResolvedValue({ ...EMPTY_SUMMARY })
})

describe('Navbar search', () => {
  it('loads matches for a typed query and opens an item', async () => {
    itemsMock.listItems.mockResolvedValue([SEARCH_NOTE])
    itemsMock.loadItem.mockResolvedValue({ ...SEARCH_NOTE_ITEM })

    renderRoute('/collections')

    fireEvent.click(await screen.findByRole('button', { name: 'Search the vault' }))

    const field = await screen.findByRole('textbox', { name: 'Search' })
    fireEvent.change(field, { target: { value: 'alpha' } })

    await waitFor(() => expect(itemsMock.listItems).toHaveBeenLastCalledWith({ query: 'alpha' }))
    expect(await screen.findByText('Alpha note')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Alpha note/ }))

    expect(await screen.findByRole('heading', { name: 'Item details' })).toBeInTheDocument()
    expect(itemsMock.loadItem).toHaveBeenCalledWith(SEARCH_NOTE.id)
    expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument()
  })

  it('caps the list at eight matches and counts the rest', async () => {
    itemsMock.listItems.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => ({
        ...SEARCH_NOTE,
        id: `search-${index}`,
        title: `Alpha note ${index}`,
      })),
    )

    renderRoute('/collections')

    fireEvent.click(await screen.findByRole('button', { name: 'Search the vault' }))
    fireEvent.change(await screen.findByRole('textbox', { name: 'Search' }), {
      target: { value: 'alpha' },
    })

    expect(await screen.findByText('Alpha note 0')).toBeInTheDocument()
    expect(screen.queryByText('Alpha note 8')).not.toBeInTheDocument()
    expect(screen.getByText('Showing first 8 of 10 matches.')).toBeInTheDocument()
  })

  it('runs no query before a search is typed', async () => {
    renderRoute('/collections')

    fireEvent.click(await screen.findByRole('button', { name: 'Search the vault' }))

    expect(await screen.findByRole('heading', { name: 'Search the vault' })).toBeInTheDocument()
    expect(itemsMock.listItems).not.toHaveBeenCalled()
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument()
  })

  it('shows the no-match state and recovers from a failed search', async () => {
    itemsMock.listItems.mockRejectedValueOnce(new Error('offline'))

    renderRoute('/collections')

    fireEvent.click(await screen.findByRole('button', { name: 'Search the vault' }))

    const field = await screen.findByRole('textbox', { name: 'Search' })
    fireEvent.change(field, { target: { value: 'zzz' } })

    expect(await screen.findByText('Your search could not run. Try again.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('No matches.')).toBeInTheDocument()
  })

  it('opens the dialog from the Ctrl F shortcut', async () => {
    renderRoute('/collections')

    expect(screen.getByTitle('Control').closest('kbd')).toHaveTextContent('F')

    fireEvent.keyDown(document, { key: 'f', ctrlKey: true })

    expect(await screen.findByRole('heading', { name: 'Search the vault' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
  })

  it('no longer exposes the search page route', async () => {
    renderRoute('/search')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Not Found', exact: true }),
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

    openRowMenu('Starred note')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove favorite' }))

    await waitFor(() => expect(itemsMock.setItemsFavorite).toHaveBeenCalledWith([FAVORITE_NOTE.id], false))
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Starred note')).toBeInTheDocument()
  })
})

describe('DashboardPage', () => {
  it('keeps dashboard sections visible as placeholders until data loads', async () => {
    const pendingSummary = deferred<typeof POPULATED_SUMMARY>()
    const pendingFavorites = deferred<ItemSummary[]>()
    const pendingCollections = deferred<Collection[]>()
    dashboardMock.loadVaultSummary.mockReturnValue(pendingSummary.promise)
    itemsMock.listItems.mockReturnValue(pendingFavorites.promise)
    collectionsMock.listCollections.mockReturnValue(pendingCollections.promise)

    renderRoute('/dashboard')

    const loadingStatus = screen.getByRole('status', { name: 'Loading your dashboard' })
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quick Add' })).toBeInTheDocument()

    for (const sectionName of ['Favorites', 'Collections', 'Storage']) {
      const heading = screen.getByRole('heading', { level: 2, name: sectionName })
      expect(heading.parentElement?.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    }
    expect(loadingStatus.querySelector('ul[aria-hidden="true"] li')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Work (3)' })).not.toBeInTheDocument()

    await act(async () => {
      pendingSummary.resolve({ ...POPULATED_SUMMARY })
      pendingFavorites.resolve([FAVORITE_NOTE])
      pendingCollections.resolve([{ ...COLLECTION }])
    })

    expect(await screen.findByText('Starred note')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Work (3)' })).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading your dashboard' })).not.toBeInTheDocument()
  })

  it('keeps the error state and retries dashboard loading', async () => {
    dashboardMock.loadVaultSummary
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ...POPULATED_SUMMARY })

    renderRoute('/dashboard')

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByRole('heading', { name: 'Your dashboard could not load' }),
    ).toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No favorites yet.' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(dashboardMock.loadVaultSummary).toHaveBeenCalledTimes(2)
  })

  it('shows the Favorites, Collections, and Storage sections for a populated vault', async () => {
    dashboardMock.loadVaultSummary.mockResolvedValue({ ...POPULATED_SUMMARY })
    itemsMock.listItems.mockResolvedValue([FAVORITE_NOTE])
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderRoute('/dashboard')

    expect(await screen.findByText('Starred note')).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: 'Favorites' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Collections' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Storage' })).toBeInTheDocument()

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
    renderRoute('/dashboard')

    fireEvent.click(await screen.findByRole('button', { name: 'Add Note' }))

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('')
    expect(screen.getByPlaceholderText('Untitled note')).toBeInTheDocument()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
    expect(itemsMock.loadItem).not.toHaveBeenCalled()
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
