import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import type { ItemSummary, VaultItem } from '../data/items'
import type { Collection } from '../data/collections'
import type { Preferences } from '../data/settings'
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
  pickFiles: vi.fn(),
  openItemFile: vi.fn(),
  revealItemFile: vi.fn(),
  openSourceUrl: vi.fn(),
}))

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
  saveCollection: vi.fn(),
  deleteCollection: vi.fn(),
  verifyCollectionSecret: vi.fn(),
}))

const settingsMock = vi.hoisted(() => ({
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
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

const navigateMock = vi.hoisted(() => vi.fn())
const sourceDialogMock = vi.hoisted(() =>
  vi.fn((_props: { open: boolean; itemId: string | null }) => null),
)

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/settings', () => settingsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/activity', () => activityMock)
vi.mock('../data/dashboard', () => dashboardMock)
vi.mock('../features/sources/SaveSourceDialog', () => ({ default: sourceDialogMock }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'
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
  content: null,
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
  content: '<p>Body text</p>',
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
  protection: 'none',
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
  filesMock.pickFiles.mockResolvedValue(null)
  filesMock.openItemFile.mockResolvedValue(undefined)
  filesMock.revealItemFile.mockResolvedValue(undefined)
  collectionsMock.listCollections.mockResolvedValue([])
  collectionsMock.saveCollection.mockResolvedValue({ ...COLLECTION })
  collectionsMock.deleteCollection.mockResolvedValue(undefined)
  collectionsMock.verifyCollectionSecret.mockResolvedValue(true)
  settingsMock.loadPreferences.mockResolvedValue({ ...DEFAULT_PREFERENCES })
  settingsMock.savePreferences.mockResolvedValue(undefined)
  tagsMock.listTags.mockResolvedValue([])
  tagsMock.saveTag.mockResolvedValue({ ...TAG })
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

describe('FilesPage', () => {
  it('imports every picked file and reloads the list once', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])
    filesMock.pickFiles.mockResolvedValue(['C:\\Docs\\Report.pdf', 'C:\\Docs\\Notes.txt'])

    renderInRouter(<FilesPage />)
    await screen.findByRole('heading', { level: 1, name: 'Files', exact: true })
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Import files' }))

    await waitFor(() =>
      expect(itemsMock.importFile).toHaveBeenCalledWith('C:\\Docs\\Notes.txt'),
    )
    expect(itemsMock.importFile).toHaveBeenCalledWith('C:\\Docs\\Report.pdf')
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledTimes(2))
    expect(itemsMock.listItems).toHaveBeenCalledWith({ kind: 'file' })
  })

  it('does nothing when the picker is cancelled', async () => {
    filesMock.pickFiles.mockResolvedValue(null)

    renderInRouter(<FilesPage />)
    await screen.findByRole('heading', { level: 1, name: 'Files', exact: true })

    fireEvent.click(screen.getByRole('button', { name: 'Import files' }))

    await waitFor(() => expect(filesMock.pickFiles).toHaveBeenCalledTimes(1))
    expect(itemsMock.importFile).not.toHaveBeenCalled()
  })

  it('keeps importing the rest when one file fails', async () => {
    filesMock.pickFiles.mockResolvedValue(['C:\\Docs\\Broken.pdf', 'C:\\Docs\\Report.pdf'])
    itemsMock.importFile.mockRejectedValueOnce(new Error('missing'))

    renderInRouter(<FilesPage />)
    await screen.findByRole('heading', { level: 1, name: 'Files', exact: true })

    fireEvent.click(screen.getByRole('button', { name: 'Import files' }))

    await waitFor(() =>
      expect(itemsMock.importFile).toHaveBeenCalledWith('C:\\Docs\\Report.pdf'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('could not import')
    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledTimes(2))
  })

  it('opens and reveals a file through the row menu', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Budget 2026.pdf' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Open' }))
    await waitFor(() => expect(filesMock.openItemFile).toHaveBeenCalledWith(FILE.id))

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Budget 2026.pdf' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reveal' }))
    await waitFor(() => expect(filesMock.revealItemFile).toHaveBeenCalledWith(FILE.id))
  })

  it('renames a file with the loaded kind', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Budget 2026.pdf' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }))

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
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Budget 2026.pdf' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to collection' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith([FILE.id], 'col-1'),
    )
  })

  it('trashes a file after confirmation', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Budget 2026.pdf' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith([FILE.id]))
  })

  it('marks a missing file and disables its open action', async () => {
    itemsMock.listItems.mockResolvedValue([FILE_MISSING])

    renderInRouter(<FilesPage />)

    expect(await screen.findByText('File is missing')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Budget 2026.pdf' })).toBeDisabled()
  })

  it('shows the file type icon for the detected format', async () => {
    itemsMock.listItems.mockResolvedValue([FILE])

    const view = renderInRouter(<FilesPage />)
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    expect(screen.getByRole('list').closest('[data-slot="scroll-shadow"]')).not.toBeNull()
    expect(view.container.querySelector('[data-file-icon="pdf"]')).not.toBeNull()
  })
})

describe('CollectionsPage', () => {
  const READING: Collection = {
    id: 'col-2',
    name: 'Reading',
    icon: null,
    protection: 'none',
    sortOrder: 1,
    createdAt: '2026-09-11T09:00:00.000Z',
    itemCount: 0,
  }

  const LOCKED: Collection = {
    ...COLLECTION,
    id: 'col-locked',
    name: 'Vault',
    protection: 'password',
  }

  function renderCollections(overrides: Partial<Preferences> = {}) {
    return render(
      <MemoryRouter>
        <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, ...overrides }}>
          <CollectionsPage />
        </PreferencesProvider>
      </MemoryRouter>,
    )
  }

  async function openNewCollectionDialog() {
    await screen.findByRole('heading', { level: 1, name: 'Collections', exact: true })
    fireEvent.click(screen.getByRole('button', { name: 'New collection' }))
    return screen.findByRole('dialog')
  }

  async function openRowMenu(name: string, action: string) {
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }))
    fireEvent.click(await screen.findByRole('menuitem', { name: action }))
  }

  it('shows the loading state, then the collection list', async () => {
    let resolveCollections: (value: Collection[]) => void = () => undefined
    collectionsMock.listCollections.mockReturnValue(
      new Promise<Collection[]>((resolve) => {
        resolveCollections = resolve
      }),
    )

    renderCollections({ collectionsView: 'list' })

    expect(screen.getByRole('status')).toBeInTheDocument()

    await act(async () => {
      resolveCollections([{ ...COLLECTION }])
    })

    expect(await screen.findByRole('button', { name: 'Work' })).toBeInTheDocument()
  })

  it('creates a collection with no protection and the folder icon', async () => {
    renderCollections()
    const dialog = await openNewCollectionDialog()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Work' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: undefined,
        name: 'Work',
        icon: 'folder',
        protection: 'none',
      }),
    )
    expect(collectionsMock.saveCollection.mock.calls.at(-1)?.[0]).not.toHaveProperty('secret')
  })

  it('creates a collection with a password', async () => {
    renderCollections()
    const dialog = await openNewCollectionDialog()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Private' },
    })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Password' }))
    fireEvent.change(
      within(dialog).getByLabelText('Password', { selector: 'input[type="password"]' }),
      { target: { value: 'hunter2' } },
    )
    fireEvent.change(within(dialog).getByLabelText('Confirm password'), {
      target: { value: 'hunter2' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: undefined,
        name: 'Private',
        icon: 'folder',
        protection: 'password',
        secret: 'hunter2',
      }),
    )
  })

  it('reports a short or mismatched password and does not save', async () => {
    renderCollections()
    const dialog = await openNewCollectionDialog()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Private' },
    })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Password' }))

    const secret = within(dialog).getByLabelText('Password', {
      selector: 'input[type="password"]',
    })
    const confirm = within(dialog).getByLabelText('Confirm password')

    fireEvent.change(secret, { target: { value: 'abc' } })
    fireEvent.change(confirm, { target: { value: 'abc' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    expect(await screen.findByText('Password must be at least 4 characters.')).toBeInTheDocument()

    fireEvent.change(secret, { target: { value: 'abcd' } })
    fireEvent.change(confirm, { target: { value: 'abce' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(collectionsMock.saveCollection).not.toHaveBeenCalled()
  })

  it('creates a collection with a PIN and rejects a mismatch', async () => {
    renderCollections()
    const dialog = await openNewCollectionDialog()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Collection name' }), {
      target: { value: 'Secret' },
    })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'PIN' }))

    const pin = within(dialog).getByLabelText('PIN', { selector: 'input[data-input-otp]' })
    const confirmPin = within(dialog).getByLabelText('Confirm PIN', {
      selector: 'input[data-input-otp]',
    })

    fireEvent.change(pin, { target: { value: '1234' } })
    fireEvent.change(confirmPin, { target: { value: '4321' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    expect(await screen.findByText('PINs do not match.')).toBeInTheDocument()
    expect(collectionsMock.saveCollection).not.toHaveBeenCalled()

    fireEvent.change(confirmPin, { target: { value: '1234' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))

    await waitFor(() =>
      expect(collectionsMock.saveCollection).toHaveBeenCalledWith({
        id: undefined,
        name: 'Secret',
        icon: 'folder',
        protection: 'pin',
        secret: '1234',
      }),
    )
  })

  it('renames a collection without sending its protection', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderCollections({ collectionsView: 'list' })
    await screen.findByRole('button', { name: 'Work' })
    await openRowMenu('Work', 'Rename Work')

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
    const payload = collectionsMock.saveCollection.mock.calls.at(-1)?.[0] ?? {}
    expect(payload).not.toHaveProperty('protection')
    expect(payload).not.toHaveProperty('secret')
  })

  it('deletes a collection after confirmation', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderCollections({ collectionsView: 'list' })
    await screen.findByRole('button', { name: 'Work' })
    await openRowMenu('Work', 'Delete Work')

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete collection' }))

    await waitFor(() => expect(collectionsMock.deleteCollection).toHaveBeenCalledWith(COLLECTION.id))
  })

  it('opens a collection from its list row and loads its items', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith({ collectionId: COLLECTION.id }),
    )
    expect(await screen.findByRole('heading', { level: 2, name: 'Work' })).toBeInTheDocument()
    expect(await screen.findByText('Meeting notes')).toBeInTheDocument()
  })

  it('hides the page chrome and switches item layouts inside a collection', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Work' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New collection' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Search collection' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename Work' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Work' })).not.toBeInTheDocument()
    expect(screen.queryByText('Collection')).not.toBeInTheDocument()

    expect((await screen.findByText('Body text')).className).toContain('truncate')
    expect(screen.getByText('Note')).toBeInTheDocument()

    const gridTab = screen.getByRole('tab', { name: 'Grid' })
    fireEvent.click(gridTab)

    await waitFor(() => expect(gridTab).toHaveAttribute('aria-selected', 'true'))
    expect((await screen.findByText('Body text')).className).toContain('line-clamp-2')
  })

  it('reads the address of each source item in a collection', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([
      { ...NOTE },
      { ...NOTE, id: 'source-1', kind: 'source', title: 'Spec sheet', content: null },
    ])
    itemsMock.loadItem.mockResolvedValue({
      ...LOADED_FILE,
      id: 'source-1',
      kind: 'source',
      title: 'Spec sheet',
      url: 'https://example.com/spec',
    })

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))

    expect(await screen.findByText('Source')).toBeInTheDocument()
    await waitFor(() => expect(itemsMock.loadItem).toHaveBeenCalledWith('source-1'))
    expect(await screen.findByText('https://example.com/spec')).toBeInTheDocument()
  })

  it('shows the empty message for a collection with no items', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION, itemCount: 0 }])
    itemsMock.listItems.mockResolvedValue([])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))

    expect(await screen.findByText('No items in this collection.')).toBeInTheDocument()
  })

  it('offers the item actions on a right click inside a collection', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([{ ...NOTE }, { ...FILE }])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Meeting notes' }))

    expect(await screen.findByRole('menuitem', { name: 'Open note' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remove from collection' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Move to trash' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Reveal' })).not.toBeInTheDocument()
  })

  it('takes an item out of the collection through its menu', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    await screen.findByRole('button', { name: 'Meeting notes' })

    const loads = itemsMock.listItems.mock.calls.length

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Meeting notes' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove from collection' }))

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith([NOTE.id], null),
    )
    await waitFor(() => expect(itemsMock.listItems.mock.calls.length).toBeGreaterThan(loads))
  })

  it('moves an item to Trash through its menu after confirmation', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    await screen.findByRole('button', { name: 'Meeting notes' })

    const loads = itemsMock.listItems.mock.calls.length

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Meeting notes' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith([NOTE.id]))
    await waitFor(() => expect(itemsMock.listItems.mock.calls.length).toBeGreaterThan(loads))
  })

  it('reveals a file through its menu', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([FILE])

    renderCollections({ collectionsView: 'list' })
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    await screen.findByRole('button', { name: 'Budget 2026.pdf' })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Budget 2026.pdf' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reveal' }))

    await waitFor(() => expect(filesMock.revealItemFile).toHaveBeenCalledWith(FILE.id))
  })

  it('switches to the grid layout and remembers it', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])

    renderCollections({ collectionsView: 'list' })
    await screen.findByRole('button', { name: 'Work' })
    expect(screen.queryByRole('button', { name: 'Open collection Work' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Grid' }))

    await waitFor(() =>
      expect(settingsMock.savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ collectionsView: 'grid' }),
      ),
    )
    expect(await screen.findByRole('button', { name: 'Open collection Work' })).toBeInTheDocument()
  })

  it('filters collections by name and shows the no-result state', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }, { ...READING }])

    renderCollections({ collectionsView: 'list' })
    await screen.findByRole('button', { name: 'Work' })
    expect(screen.getByRole('button', { name: 'Reading' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search collection' }), {
      target: { value: 'read' },
    })

    expect(screen.queryByRole('button', { name: 'Work' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reading' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search collection' }), {
      target: { value: 'zzz' },
    })

    expect(await screen.findByText('No collections match your search.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reading' })).not.toBeInTheDocument()
  })

  it('opens the collection named in the query parameter', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...COLLECTION }])
    itemsMock.listItems.mockResolvedValue([NOTE])

    render(
      <MemoryRouter initialEntries={[`/collections?collection=${COLLECTION.id}`]}>
        <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES }}>
          <Routes>
            <Route path="/collections" element={<CollectionsPage />} />
          </Routes>
        </PreferencesProvider>
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith({ collectionId: COLLECTION.id }),
    )
    expect(await screen.findByText('Meeting notes')).toBeInTheDocument()
  })

  it('gates a protected collection behind the unlock dialog', async () => {
    collectionsMock.listCollections.mockResolvedValue([{ ...LOCKED }])
    collectionsMock.verifyCollectionSecret.mockResolvedValue(false)
    itemsMock.listItems.mockResolvedValue([NOTE])

    renderCollections({ collectionsView: 'list' })

    await screen.findByRole('button', { name: 'Vault' })
    expect(screen.getByText('Protected')).toBeInTheDocument()
    expect(itemsMock.listItems).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Vault' }))

    const dialog = await screen.findByRole('dialog')
    const passwordField = () =>
      within(dialog).getByLabelText('Password', { selector: 'input[type="password"]' })

    fireEvent.change(passwordField(), { target: { value: 'nope' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('That password did not match. Try again.')).toBeInTheDocument()
    expect(itemsMock.listItems).not.toHaveBeenCalled()

    collectionsMock.verifyCollectionSecret.mockResolvedValue(true)
    fireEvent.change(passwordField(), { target: { value: 'open-sesame' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unlock' }))

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith({ collectionId: LOCKED.id }),
    )
    expect(await screen.findByText('Meeting notes')).toBeInTheDocument()
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
