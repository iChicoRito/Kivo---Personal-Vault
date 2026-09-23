import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemSummary } from '../data/items'

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

const TRASHED_NOTE: ItemSummary = {
  id: 'trash-1',
  kind: 'note',
  title: 'Trashed note',
  isFavorite: false,
  collectionId: null,
  updatedAt: '2026-09-16T10:00:00.000Z',
  deletedAt: '2026-09-15T08:00:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: null,
  content: null,
}

const TRASHED_SOURCE: ItemSummary = {
  id: 'trash-2',
  kind: 'source',
  title: 'Trashed source',
  isFavorite: false,
  collectionId: null,
  updatedAt: '2026-09-14T10:00:00.000Z',
  deletedAt: '2026-09-14T08:00:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: null,
  content: null,
}

function renderTrash() {
  return render(
    <MemoryRouter initialEntries={['/trash']}>
      <AppRoutes />
    </MemoryRouter>,
  )
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
  dashboardMock.loadVaultSummary.mockResolvedValue({
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
  })
})

describe('TrashPage', () => {
  it('shows item-shaped placeholders while loading and keeps page actions available', async () => {
    let resolveItems!: (items: ItemSummary[]) => void
    itemsMock.listItems.mockReturnValue(
      new Promise<ItemSummary[]>((resolve) => {
        resolveItems = resolve
      }),
    )

    renderTrash()

    const loadingStatus = screen.getByRole('status', { name: 'Loading trash' })
    expect(loadingStatus.querySelectorAll('li')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Trash' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empty Trash' })).toBeDisabled()

    await act(async () => resolveItems([]))
    expect(await screen.findByText('Trash is empty.')).toBeInTheDocument()
  })

  it('lists trashed items', async () => {
    itemsMock.listItems.mockResolvedValue([TRASHED_NOTE])

    renderTrash()

    expect(await screen.findByText('Trashed note')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledWith({ trashed: true })
    expect(screen.getByRole('list', { name: 'All items' })).toBeInTheDocument()
  })

  it('restores an item and reloads the list', async () => {
    itemsMock.listItems.mockResolvedValue([TRASHED_NOTE])

    renderTrash()
    await screen.findByText('Trashed note')

    openRowMenu('Trashed note')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Restore' }))

    await waitFor(() => expect(itemsMock.restoreItems).toHaveBeenCalledWith([TRASHED_NOTE.id]))
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledTimes(2))
  })

  it('deletes an item permanently only after the confirmation', async () => {
    itemsMock.listItems.mockResolvedValue([TRASHED_NOTE])

    renderTrash()
    await screen.findByText('Trashed note')

    openRowMenu('Trashed note')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete permanently' }))

    const heading = await screen.findByRole('heading', {
      name: 'Permanently delete this item?',
    })
    expect(itemsMock.deleteItemsPermanently).not.toHaveBeenCalled()

    const dialog = heading.closest('[role="dialog"]') as HTMLElement
    expect(dialog).not.toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() =>
      expect(itemsMock.deleteItemsPermanently).toHaveBeenCalledWith([TRASHED_NOTE.id]),
    )
  })

  it('disables Empty Trash when the trash is empty', async () => {
    renderTrash()

    expect(await screen.findByRole('button', { name: 'Empty Trash' })).toBeDisabled()
    expect(screen.getByText('Trash is empty.')).toBeInTheDocument()
  })

  it('empties the trash after confirmation with every trashed id', async () => {
    itemsMock.listItems.mockResolvedValue([TRASHED_NOTE, TRASHED_SOURCE])

    renderTrash()
    await screen.findByText('Trashed note')

    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }))

    const heading = await screen.findByRole('heading', { name: 'Empty Trash?' })
    const dialog = heading.closest('[role="dialog"]') as HTMLElement
    expect(dialog).not.toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Empty Trash' }))

    await waitFor(() =>
      expect(itemsMock.deleteItemsPermanently).toHaveBeenCalledWith([
        TRASHED_NOTE.id,
        TRASHED_SOURCE.id,
      ]),
    )
  })

  it('shows the empty message for an empty trash', async () => {
    renderTrash()

    expect(await screen.findByText('Trash is empty.')).toBeInTheDocument()
  })

  it('retries loading trashed items after an error', async () => {
    itemsMock.listItems
      .mockRejectedValueOnce(new Error('list failed'))
      .mockResolvedValueOnce([TRASHED_NOTE])

    renderTrash()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Trash could not load')

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Trashed note')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledTimes(2)
  })
})
