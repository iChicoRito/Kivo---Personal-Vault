import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const itemsMock = vi.hoisted(() => ({
  saveItem: vi.fn(),
  loadItem: vi.fn(),
  listItems: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
  moveItemsToCollection: vi.fn(),
  trashItems: vi.fn(),
  restoreItems: vi.fn(),
  deleteItemsPermanently: vi.fn(),
  importFile: vi.fn(),
  setItemTags: vi.fn(),
}))

const dashboardMock = vi.hoisted(() => ({
  loadVaultSummary: vi.fn(),
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

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/dashboard', () => dashboardMock)

import { AppRoutes } from '../app/router'

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

const destinations: Array<[path: string, heading: string]> = [
  ['/dashboard', 'Dashboard'],
  ['/items', 'All Items'],
  ['/notes', 'Notes'],
  ['/sources', 'Source'],
  ['/files', 'Files'],
  ['/collections', 'Collections'],
  ['/favorites', 'Favorites'],
  ['/trash', 'Trash'],
  ['/settings', 'Settings'],
]

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([])
  itemsMock.loadItem.mockResolvedValue(undefined)
  collectionsMock.listCollections.mockResolvedValue([])
  tagsMock.listTags.mockResolvedValue([])
  filesMock.pickFile.mockResolvedValue(null)
  dashboardMock.loadVaultSummary.mockResolvedValue({ ...EMPTY_SUMMARY })
})

describe('router', () => {
  it('lands on Dashboard for the root path', async () => {
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard', exact: true })).toBeInTheDocument()
  })

  it.each(destinations)('opens %s as its own route', async (path, heading) => {
    renderAt(path)

    expect(
      await screen.findByRole('heading', { level: 1, name: heading, exact: true }),
    ).toBeInTheDocument()
  })

  it('opens the note editor for a note id', async () => {
    itemsMock.loadItem.mockResolvedValue({
      id: 'note-1',
      kind: 'note',
      title: 'Alpha note',
      description: '',
      content: 'Body text',
      url: null,
      collectionId: null,
      isFavorite: false,
      isPinned: false,
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-02T10:00:00Z',
      tags: [],
      file: null,
      fileMissing: false,
    })

    renderAt('/notes/note-1')

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Alpha note')
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveTextContent('Body text')
  })

  it('renders the exact not-found heading for unknown paths', async () => {
    renderAt('/not-a-kivo-destination')

    expect(await screen.findByRole('heading', { name: 'Not Found', exact: true })).toBeInTheDocument()
  })
})
