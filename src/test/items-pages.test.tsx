import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const itemsMock = vi.hoisted(() => ({
  listItems: vi.fn(),
  loadItem: vi.fn(),
  saveItem: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
  moveItemsToCollection: vi.fn(),
  trashItems: vi.fn(),
  importFile: vi.fn(),
  setItemTags: vi.fn(),
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

const filesMock = vi.hoisted(() => ({
  pickFile: vi.fn(),
  openItemFile: vi.fn(),
  revealItemFile: vi.fn(),
  openSourceUrl: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/files', () => filesMock)

// The pickers open HeroUI Select popovers that are awkward to drive in jsdom.
// Replace them with native selects so the page and dialog wiring stays under test.
vi.mock('../components/items/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/items/dialogs')>()

  return {
    ...actual,
    CollectionSelect: ({
      value,
      onChange,
      label,
    }: {
      value: string | null
      onChange: (next: string | null) => void
      label?: string
    }) => (
      <select
        aria-label={label ?? 'Collection'}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">No collection</option>
        <option value="collection-1">Collection One</option>
        <option value="collection-2">Collection Two</option>
      </select>
    ),
    TagPicker: ({
      value,
      onChange,
      label,
    }: {
      value: string[]
      onChange: (next: string[]) => void
      label?: string
    }) => (
      <select
        aria-label={label ?? 'Tags'}
        value={value[0] ?? ''}
        onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
      >
        <option value="">No tags</option>
        <option value="alpha">alpha</option>
      </select>
    ),
  }
})

import { ItemsPage } from '../features/items/ItemsPage'
import { ItemDetailsDialog } from '../features/items/ItemDetailsDialog'
import type { Collection } from '../data/collections'
import type { Tag } from '../data/tags'
import type { ItemSummary, VaultItem } from '../data/items'

const NOTE_ITEM: VaultItem = {
  id: 'note-1',
  kind: 'note',
  title: 'Alpha note',
  description: 'First note',
  content: '# Alpha',
  url: null,
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-02T10:00:00Z',
  tags: ['alpha'],
  file: null,
  fileMissing: false,
}

const SOURCE_ITEM: VaultItem = {
  id: 'source-1',
  kind: 'source',
  title: 'Beta source',
  description: 'A saved link',
  content: null,
  url: 'https://example.com',
  collectionId: null,
  isFavorite: true,
  isPinned: false,
  createdAt: '2026-01-03T10:00:00Z',
  updatedAt: '2026-01-04T10:00:00Z',
  tags: [],
  file: null,
  fileMissing: false,
}

const FILE_ITEM: VaultItem = {
  id: 'file-1',
  kind: 'file',
  title: 'Gamma file',
  description: 'A saved file',
  content: null,
  url: null,
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-05T10:00:00Z',
  updatedAt: '2026-01-06T10:00:00Z',
  tags: [],
  file: {
    originalName: 'gamma.pdf',
    byteSize: 2048,
    importedAt: '2026-01-07T10:00:00Z',
  },
  fileMissing: false,
}

const MISSING_FILE_ITEM: VaultItem = {
  ...FILE_ITEM,
  id: 'file-2',
  title: 'Delta file',
  fileMissing: true,
}

const COLLECTIONS: Collection[] = [
  { id: 'collection-1', name: 'Collection One', icon: null, sortOrder: 1, createdAt: '', itemCount: 0 },
  { id: 'collection-2', name: 'Collection Two', icon: null, sortOrder: 2, createdAt: '', itemCount: 0 },
]

const TAGS: Tag[] = [{ id: 'tag-1', name: 'alpha', count: 1 }]

function toSummary(item: VaultItem): ItemSummary {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    isFavorite: item.isFavorite,
    collectionId: item.collectionId,
    updatedAt: item.updatedAt,
    fileMissing: item.fileMissing,
    isPinned: item.isPinned,
    file: item.file,
  }
}

function renderItemsPage() {
  return render(<ItemsPage />)
}

async function chooseSelectOption(triggerName: RegExp, optionName: string) {
  fireEvent.click(screen.getByRole('button', { name: triggerName }))
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

function renderDetails(itemId: string | null = 'note-1') {
  const onClose = vi.fn()
  const onChanged = vi.fn()

  render(<ItemDetailsDialog itemId={itemId} onClose={onClose} onChanged={onChanged} />)

  return { onClose, onChanged }
}

beforeEach(() => {
  vi.clearAllMocks()

  itemsMock.listItems.mockResolvedValue([NOTE_ITEM, SOURCE_ITEM].map(toSummary))
  itemsMock.loadItem.mockResolvedValue(NOTE_ITEM)
  itemsMock.saveItem.mockResolvedValue(NOTE_ITEM)
  itemsMock.setItemPinned.mockResolvedValue(undefined)
  itemsMock.setItemsFavorite.mockResolvedValue(undefined)
  itemsMock.moveItemsToCollection.mockResolvedValue(undefined)
  itemsMock.trashItems.mockResolvedValue(undefined)
  itemsMock.importFile.mockResolvedValue(NOTE_ITEM)
  itemsMock.setItemTags.mockResolvedValue([])

  collectionsMock.listCollections.mockResolvedValue([...COLLECTIONS])
  tagsMock.listTags.mockResolvedValue([...TAGS])

  filesMock.pickFile.mockResolvedValue(null)
  filesMock.openItemFile.mockResolvedValue(undefined)
  filesMock.revealItemFile.mockResolvedValue(undefined)
  filesMock.openSourceUrl.mockResolvedValue(undefined)
})

describe('ItemsPage', () => {
  it('shows a loading state and then the item rows', async () => {
    renderItemsPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your items')
    expect(await screen.findByText('Alpha note')).toBeInTheDocument()
    expect(screen.getByText('Beta source')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no items', async () => {
    itemsMock.listItems.mockResolvedValue([])
    renderItemsPage()

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No items yet.', exact: true }),
    ).toBeInTheDocument()
    expect(screen.getByText('EMPTY STATE')).toBeInTheDocument()
  })

  it('shows an error alert and reloads from Try again', async () => {
    itemsMock.listItems
      .mockRejectedValueOnce(new Error('list failed'))
      .mockResolvedValueOnce([toSummary(NOTE_ITEM)])
    renderItemsPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Your items could not load')

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Alpha note')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledTimes(2)
  })

  it('reloads with the combined filter when the search term changes', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')
    itemsMock.listItems.mockClear()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search items' }), {
      target: { value: 'alpha' },
    })

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'alpha', sort: 'updated' }),
      ),
    )
  })

  it('reloads with the favorite filter when the toggle changes', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')
    itemsMock.listItems.mockClear()

    fireEvent.click(screen.getByRole('switch', { name: 'Favorites only' }))

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenCalledWith(
        expect.objectContaining({ favorite: true }),
      ),
    )
  })

  it('reloads with the chosen sort', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')
    itemsMock.listItems.mockClear()

    await chooseSelectOption(/Sort by/, 'Created')

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'created' }),
      ),
    )
  })

  it('switches between list and grid view through aria-pressed', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    const listButton = screen.getByRole('button', { name: 'List view' })
    const gridButton = screen.getByRole('button', { name: 'Grid view' })

    expect(listButton).toHaveAttribute('aria-pressed', 'true')
    expect(gridButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(gridButton)

    expect(gridButton).toHaveAttribute('aria-pressed', 'true')
    expect(listButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('reloads with every combined filter', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    fireEvent.change(screen.getByRole('textbox', { name: 'Search items' }), {
      target: { value: 'alpha' },
    })
    await chooseSelectOption(/Kind/, 'Notes')
    await chooseSelectOption(/Collection/, 'Collection One')
    await chooseSelectOption(/Tag/, 'alpha')
    fireEvent.click(screen.getByRole('switch', { name: 'Favorites only' }))

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenLastCalledWith({
        kind: 'note',
        collectionId: 'collection-1',
        tagId: 'tag-1',
        favorite: true,
        query: 'alpha',
        sort: 'updated',
      }),
    )
  })

  it('clears the selection from the batch bar', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha note' }))
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
  })

  it('marks the selected items as favorite', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha note' }))
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mark favorite' }))

    await waitFor(() =>
      expect(itemsMock.setItemsFavorite).toHaveBeenCalledWith(['note-1'], true),
    )
    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
  })

  it('moves the selected items to the chosen collection', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move to collection' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Collection'), {
      target: { value: 'collection-1' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith(['note-1'], 'collection-1'),
    )
    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
  })

  it('trashes the selected items after confirmation', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith(['note-1']))
    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
  })

  it('opens the details dialog for a row', async () => {
    renderItemsPage()
    await screen.findByText('Alpha note')

    fireEvent.click(screen.getByRole('button', { name: /Alpha note/ }))

    expect(await screen.findByRole('heading', { name: 'Item details' })).toBeInTheDocument()
    expect(itemsMock.loadItem).toHaveBeenCalledWith('note-1')
  })
})

describe('ItemDetailsDialog', () => {
  it('loads and shows the common fields', async () => {
    renderDetails()

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Alpha note')
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('First note')
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Favorite' })).not.toBeChecked()
    expect(itemsMock.loadItem).toHaveBeenCalledWith('note-1')
  })

  it('saves the title and description through one action', async () => {
    const { onChanged } = renderDetails()
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Updated title' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'Updated description' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'note-1',
          kind: 'note',
          title: 'Updated title',
          description: 'Updated description',
        }),
      ),
    )
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('saves the favorite switch immediately', async () => {
    renderDetails()
    await screen.findByRole('switch', { name: 'Favorite' })

    fireEvent.click(screen.getByRole('switch', { name: 'Favorite' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'note-1', isFavorite: true }),
      ),
    )
  })

  it('shows file fields only for file items', async () => {
    renderDetails('note-1')
    await screen.findByRole('textbox', { name: 'Title' })

    expect(screen.queryByText('Original name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reveal' })).not.toBeInTheDocument()
  })

  it('shows the file fields and opens or reveals the managed file', async () => {
    itemsMock.loadItem.mockResolvedValue(FILE_ITEM)
    renderDetails('file-1')

    expect(await screen.findByText('gamma.pdf')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(filesMock.openItemFile).toHaveBeenCalledWith('file-1'))

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await waitFor(() => expect(filesMock.revealItemFile).toHaveBeenCalledWith('file-1'))
  })

  it('shows a missing file state and disables the file actions', async () => {
    itemsMock.loadItem.mockResolvedValue(MISSING_FILE_ITEM)
    renderDetails('file-2')

    expect(
      await screen.findByText('This file is missing from the vault folder.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeDisabled()
  })

  it('trashes the item, closes the dialog, and notifies the parent', async () => {
    const { onClose, onChanged } = renderDetails('note-1')
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }))

    const heading = await screen.findByRole('heading', { name: 'Move this item to Trash?' })
    const confirmDialog = heading.closest('[role="dialog"]') as HTMLElement
    expect(confirmDialog).not.toBeNull()

    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Move to trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith(['note-1']))
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('saves a collection change through saveItem', async () => {
    renderDetails()
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByLabelText('Collection'), {
      target: { value: 'collection-1' },
    })

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'note-1', collectionId: 'collection-1' }),
      ),
    )
  })

  it('saves a tag change through setItemTags', async () => {
    renderDetails()
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'alpha' } })

    await waitFor(() => expect(itemsMock.setItemTags).toHaveBeenCalledWith('note-1', ['alpha']))
  })

  it('shows the common fields for a source item', async () => {
    itemsMock.loadItem.mockResolvedValue(SOURCE_ITEM)
    renderDetails('source-1')

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Beta source')
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('A saved link')
    expect(screen.getByRole('switch', { name: 'Favorite' })).toBeChecked()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.queryByText('Original name')).not.toBeInTheDocument()
  })

  it('favorites and tags a file item', async () => {
    itemsMock.loadItem.mockResolvedValue(FILE_ITEM)
    itemsMock.saveItem.mockResolvedValue(FILE_ITEM)
    renderDetails('file-1')
    await screen.findByText('gamma.pdf')

    fireEvent.click(screen.getByRole('switch', { name: 'Favorite' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file-1', isFavorite: true }),
      ),
    )

    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'alpha' } })

    await waitFor(() => expect(itemsMock.setItemTags).toHaveBeenCalledWith('file-1', ['alpha']))
  })

  it('shows a saved metadata change without leaving the dialog', async () => {
    itemsMock.saveItem.mockImplementation(async (input) => ({ ...NOTE_ITEM, ...input }))
    renderDetails()
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed in place' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'Fresh description' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Renamed in place', description: 'Fresh description' }),
      ),
    )

    expect(screen.getByRole('heading', { name: 'Item details' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Renamed in place')
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Fresh description')
  })
})
