import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import type { ItemSummary, VaultItem } from '../data/items'
import type { Collection } from '../data/collections'
import type { Tag } from '../data/tags'

const itemsMock = vi.hoisted(() => ({
  saveItem: vi.fn(),
  loadItem: vi.fn(),
  listItems: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
  moveItemsToCollection: vi.fn(),
  trashItems: vi.fn(),
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

const navigateMock = vi.hoisted(() => vi.fn())
const sourceDialogMock = vi.hoisted(() =>
  vi.fn((_props: { open: boolean; itemId: string | null }) => null),
)

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../features/sources/SaveSourceDialog', () => ({ default: sourceDialogMock }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

import { FilesPage } from '../features/files/FilesPage'
import { CollectionsPage } from '../features/collections/CollectionsPage'
import { TagsPage } from '../features/tags/TagsPage'
import { QuickAddDialog } from '../features/quick-add/QuickAddDialog'
import DashboardPage from '../features/dashboard/DashboardPage'

const FILE: ItemSummary = {
  id: 'file-1',
  kind: 'file',
  title: 'Budget 2026.pdf',
  isFavorite: false,
  collectionId: 'col-1',
  updatedAt: '2026-09-15T08:00:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: {
    originalName: 'Budget 2026.pdf',
    byteSize: 284_915,
    importedAt: '2026-09-15T08:00:00.000Z',
  },
}

const FILE_MISSING: ItemSummary = { ...FILE, fileMissing: true }

const LOADED_FILE: VaultItem = {
  id: FILE.id,
  kind: 'file',
  title: FILE.title,
  description: '',
  content: null,
  url: null,
  collectionId: FILE.collectionId,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: FILE.updatedAt,
  tags: [],
  file: FILE.file,
  fileMissing: false,
}

const NOTE: ItemSummary = {
  id: 'note-1',
  kind: 'note',
  title: 'Meeting notes',
  isFavorite: false,
  collectionId: null,
  updatedAt: '2026-09-16T14:05:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: null,
}

const NOTE_ITEM: VaultItem = {
  id: NOTE.id,
  kind: 'note',
  title: 'Untitled note',
  description: '',
  content: '',
  url: null,
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-09-16T14:05:00.000Z',
  updatedAt: '2026-09-16T14:05:00.000Z',
  tags: [],
  file: null,
  fileMissing: false,
}

const COLLECTION: Collection = {
  id: 'col-1',
  name: 'Work',
  icon: null,
  sortOrder: 0,
  createdAt: '2026-09-10T11:20:00.000Z',
  itemCount: 1,
}

const TAG: Tag = {
  id: 'tag-1',
  name: 'design',
  count: 2,
}

function renderInRouter(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([])
  itemsMock.saveItem.mockResolvedValue({ ...NOTE_ITEM })
  itemsMock.loadItem.mockResolvedValue({ ...LOADED_FILE })
  itemsMock.moveItemsToCollection.mockResolvedValue(undefined)
  itemsMock.trashItems.mockResolvedValue(undefined)
  itemsMock.importFile.mockResolvedValue({ ...LOADED_FILE })
  filesMock.pickFile.mockResolvedValue(null)
  filesMock.openItemFile.mockResolvedValue(undefined)
  filesMock.revealItemFile.mockResolvedValue(undefined)
  collectionsMock.listCollections.mockResolvedValue([])
  collectionsMock.saveCollection.mockResolvedValue({ ...COLLECTION })
  collectionsMock.deleteCollection.mockResolvedValue(undefined)
  tagsMock.listTags.mockResolvedValue([])
  tagsMock.saveTag.mockResolvedValue({ ...TAG })
  tagsMock.deleteTag.mockResolvedValue(undefined)
})

describe('FilesPage', () => {
  it('imports a picked file and reloads the list', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])
    filesMock.pickFile.mockResolvedValue('C:\\Docs\\Report.pdf')

    renderInRouter(<FilesPage />)
    await screen.findByRole('heading', { level: 1, name: 'Files', exact: true })
    await screen.findByRole('button', { name: 'Open Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    await waitFor(() =>
      expect(itemsMock.importFile).toHaveBeenCalledWith('C:\\Docs\\Report.pdf'),
    )
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledTimes(2))
    expect(itemsMock.listItems).toHaveBeenCalledWith({ kind: 'file' })
  })

  it('does nothing when the picker is cancelled', async () => {
    filesMock.pickFile.mockResolvedValue(null)

    renderInRouter(<FilesPage />)
    await screen.findByRole('heading', { level: 1, name: 'Files', exact: true })

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    await waitFor(() => expect(filesMock.pickFile).toHaveBeenCalledTimes(1))
    expect(itemsMock.importFile).not.toHaveBeenCalled()
  })

  it('opens and reveals a file through the file commands', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Open Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Open Budget 2026.pdf' }))
    await waitFor(() => expect(filesMock.openItemFile).toHaveBeenCalledWith(FILE.id))

    fireEvent.click(screen.getByRole('button', { name: 'Reveal Budget 2026.pdf' }))
    await waitFor(() => expect(filesMock.revealItemFile).toHaveBeenCalledWith(FILE.id))
  })

  it('renames a file with the loaded kind', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Rename Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Rename Budget 2026.pdf' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'File title' }), {
      target: { value: 'Budget 2027.pdf' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save name' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith({
        id: FILE.id,
        kind: 'file',
        title: 'Budget 2027.pdf',
        description: '',
        collectionId: 'col-1',
        isFavorite: false,
        isPinned: false,
      }),
    )
  })

  it('moves a file to its collection', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Move Budget 2026.pdf to collection' })

    fireEvent.click(screen.getByRole('button', { name: 'Move Budget 2026.pdf to collection' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith([FILE.id], 'col-1'),
    )
  })

  it('trashes a file after confirmation', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Move Budget 2026.pdf to Trash' })

    fireEvent.click(screen.getByRole('button', { name: 'Move Budget 2026.pdf to Trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith([FILE.id]))
  })

  it('shows a plain message for a missing file', async () => {
    itemsMock.listItems.mockResolvedValue([FILE_MISSING])

    renderInRouter(<FilesPage />)

    expect(
      await screen.findByText(
        'This file is missing from this device. Import it again to restore access.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Budget 2026.pdf' })).toBeDisabled()
  })

  it('shows the file type label derived from the extension', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)

    expect(await screen.findByText('PDF file')).toBeInTheDocument()
  })
})

describe('CollectionsPage', () => {
  it('creates a collection through the dialog', async () => {
    renderInRouter(<CollectionsPage />)
    await screen.findByRole('heading', { level: 1, name: 'Collections', exact: true })

    fireEvent.click(screen.getByRole('button', { name: 'New collection' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Work' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: undefined,
        name: 'Work',
        icon: null,
      }),
    )
    await waitFor(() => expect(collectionsMock.listCollections).toHaveBeenCalledTimes(2))
  })

  it('renames a collection through the dialog', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderInRouter(<CollectionsPage />)
    await screen.findByRole('button', { name: 'Rename Work' })

    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Archive' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: COLLECTION.id,
        name: 'Archive',
        icon: null,
      }),
    )
  })

  it('deletes a collection after confirmation', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderInRouter(<CollectionsPage />)
    await screen.findByRole('button', { name: 'Delete Work' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Work' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete collection' }))

    await waitFor(() => expect(collectionsMock.deleteCollection).toHaveBeenCalledWith(COLLECTION.id))
  })

  it('loads the items of a selected collection', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderInRouter(<CollectionsPage />)
    await screen.findByRole('button', { name: 'View items in Work' })

    fireEvent.click(screen.getByRole('button', { name: 'View items in Work' }))

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith({ collectionId: COLLECTION.id }),
    )
    expect(await screen.findByText('Meeting notes')).toBeInTheDocument()
  })

  it('creates a collection with a chosen icon', async () => {
    renderInRouter(<CollectionsPage />)
    await screen.findByRole('heading', { level: 1, name: 'Collections', exact: true })

    fireEvent.click(screen.getByRole('button', { name: 'New collection' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Work' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Icon/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'Folder' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: undefined,
        name: 'Work',
        icon: 'folder',
      }),
    )
  })

  it('renames a collection with a chosen icon', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderInRouter(<CollectionsPage />)
    await screen.findByRole('button', { name: 'Rename Work' })

    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Archive' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Icon/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'Star' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: COLLECTION.id,
        name: 'Archive',
        icon: 'star',
      }),
    )
  })

  it('renders the saved icon in the collection list', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION, icon: 'star' }])

    renderInRouter(<CollectionsPage />)
    await screen.findByRole('button', { name: 'Rename Work' })

    const item = screen.getByRole('listitem')
    expect(item.querySelector('svg')).not.toBeNull()
  })
})

describe('TagsPage', () => {
  it('creates a tag through the dialog', async () => {
    renderInRouter(<TagsPage />)
    await screen.findByRole('heading', { level: 1, name: 'Tags', exact: true })

    fireEvent.click(screen.getByRole('button', { name: 'New tag' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Tag name' }), {
      target: { value: 'design' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create tag' }))

    await waitFor(() =>
      expect(tagsMock.saveTag).toHaveBeenCalledWith({ id: undefined, name: 'design' }),
    )
    await waitFor(() => expect(tagsMock.listTags).toHaveBeenCalledTimes(2))
  })

  it('renames a tag through the dialog', async () => {
    tagsMock.listTags.mockResolvedValue([{ ...TAG }])

    renderInRouter(<TagsPage />)
    await screen.findByRole('button', { name: 'Rename design' })

    fireEvent.click(screen.getByRole('button', { name: 'Rename design' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Tag name' }), {
      target: { value: 'planning' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(tagsMock.saveTag).toHaveBeenCalledWith({ id: TAG.id, name: 'planning' }),
    )
  })

  it('deletes a tag after confirmation', async () => {
    tagsMock.listTags.mockResolvedValue([{ ...TAG }])

    renderInRouter(<TagsPage />)
    await screen.findByRole('button', { name: 'Delete design' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete design' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag' }))

    await waitFor(() => expect(tagsMock.deleteTag).toHaveBeenCalledWith(TAG.id))
  })

  it('loads the items of a selected tag', async () => {
    tagsMock.listTags.mockResolvedValue([{ ...TAG }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderInRouter(<TagsPage />)
    await screen.findByRole('button', { name: 'View items tagged design' })

    fireEvent.click(screen.getByRole('button', { name: 'View items tagged design' }))

    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledWith({ tagId: TAG.id }))
    expect(await screen.findByText('Meeting notes')).toBeInTheDocument()
  })
})

describe('QuickAddDialog', () => {
  it('creates a note and navigates to the editor', async () => {
    const onClose = vi.fn()
    itemsMock.saveItem.mockResolvedValue({ ...NOTE_ITEM })

    renderInRouter(<QuickAddDialog open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith({ kind: 'note', title: 'Untitled note' }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/notes/${NOTE_ITEM.id}`))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opens the save source dialog for a new source', async () => {
    const onClose = vi.fn()

    renderInRouter(<QuickAddDialog open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'New source' }))

    await waitFor(() => {
      const lastProps = sourceDialogMock.mock.calls.at(-1)?.[0]
      expect(lastProps).toEqual(expect.objectContaining({ open: true, itemId: null }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('imports a picked file and navigates to Files', async () => {
    const onClose = vi.fn()
    filesMock.pickFile.mockResolvedValue('C:\\Docs\\Report.pdf')

    renderInRouter(<QuickAddDialog open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }))

    await waitFor(() =>
      expect(itemsMock.importFile).toHaveBeenCalledWith('C:\\Docs\\Report.pdf'),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/files'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('creates a collection and navigates to Collections', async () => {
    const onClose = vi.fn()
    collectionsMock.saveCollection.mockResolvedValue({ ...COLLECTION })

    renderInRouter(<QuickAddDialog open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'New collection' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Work' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create collection' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({ name: 'Work' }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/collections'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Dashboard quick add entry', () => {
  it('opens the quick add dialog from the header button', async () => {
    renderInRouter(<DashboardPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Quick Add' }))

    expect(await screen.findByRole('heading', { name: 'Quick add' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
  })
})
