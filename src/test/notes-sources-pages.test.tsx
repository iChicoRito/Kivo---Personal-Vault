import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Mock } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const itemsMock = vi.hoisted(() => ({
  listItems: vi.fn(),
  loadItem: vi.fn(),
  saveItem: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
  setItemTags: vi.fn(),
  moveItemsToCollection: vi.fn(),
  trashItems: vi.fn(),
}))

const filesMock = vi.hoisted(() => ({
  openSourceUrl: vi.fn(),
}))

const tagsMock = vi.hoisted(() => ({
  listTags: vi.fn(),
  saveTag: vi.fn(),
  deleteTag: vi.fn(),
}))

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/collections', () => collectionsMock)

import type { ItemSummary, VaultItem } from '../data/items'
import { NoteEditor } from '../features/notes/NoteEditor'
import { NotesPage } from '../features/notes/NotesPage'
import { SaveSourceDialog } from '../features/sources/SaveSourceDialog'
import { SourcesPage } from '../features/sources/SourcesPage'

function noteSummary(overrides: Partial<ItemSummary> = {}): ItemSummary {
  return {
    id: 'n1',
    kind: 'note',
    title: 'Alpha',
    isFavorite: false,
    collectionId: null,
    updatedAt: '2026-01-02T03:04:05Z',
    fileMissing: false,
    isPinned: false,
    file: null,
    ...overrides,
  }
}

function noteItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: 'n1',
    kind: 'note',
    title: 'Alpha',
    description: '',
    content: 'Body text',
    url: null,
    collectionId: null,
    isFavorite: false,
    isPinned: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T03:04:05Z',
    tags: [],
    file: null,
    fileMissing: false,
    ...overrides,
  }
}

function sourceItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return noteItem({
    id: 's1',
    kind: 'source',
    title: 'Example',
    description: 'A summary',
    content: '',
    url: 'https://example.com',
    ...overrides,
  })
}

function renderNotes() {
  return render(
    <MemoryRouter initialEntries={['/notes']}>
      <Routes>
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/:id" element={<div>Editor route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderEditor(id = 'n1') {
  return render(
    <MemoryRouter initialEntries={[`/notes/${id}`]}>
      <Routes>
        <Route path="/notes" element={<div>Notes route</div>} />
        <Route path="/notes/:id" element={<NoteEditor />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderSources() {
  return render(
    <MemoryRouter initialEntries={['/sources']}>
      <Routes>
        <Route path="/sources" element={<SourcesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function openRowMenu(title: string) {
  const trigger = screen.getByRole('button', { name: `Actions for ${title}` })
  fireEvent.click(trigger)
  return trigger
}

beforeEach(() => {
  vi.clearAllMocks()

  itemsMock.listItems.mockResolvedValue([])
  itemsMock.loadItem.mockResolvedValue(noteItem())
  itemsMock.saveItem.mockResolvedValue(noteItem())
  itemsMock.setItemPinned.mockResolvedValue(undefined)
  itemsMock.setItemsFavorite.mockResolvedValue(undefined)
  itemsMock.setItemTags.mockResolvedValue([])
  itemsMock.moveItemsToCollection.mockResolvedValue(undefined)
  itemsMock.trashItems.mockResolvedValue(undefined)

  filesMock.openSourceUrl.mockResolvedValue(undefined)
  tagsMock.listTags.mockResolvedValue([])
  collectionsMock.listCollections.mockResolvedValue([])

  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('NotesPage', () => {
  it('shows the loading state while notes load', () => {
    itemsMock.listItems.mockReturnValue(new Promise(() => undefined))

    renderNotes()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the empty state when there are no notes', async () => {
    itemsMock.listItems.mockResolvedValue([])

    renderNotes()

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No notes yet.' }),
    ).toBeInTheDocument()
  })

  it('shows an error state and reloads from Try again', async () => {
    itemsMock.listItems
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([noteSummary()])

    renderNotes()

    const alert = await screen.findByRole('alert')
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledTimes(2)
  })

  it('passes the search text as a query filter', async () => {
    renderNotes()
    await screen.findByRole('heading', { level: 2, name: 'No notes yet.' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'roadmap' },
    })

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenLastCalledWith({ kind: 'note', query: 'roadmap' }),
    )
  })

  it('shows pinned notes before the rest', async () => {
    itemsMock.listItems.mockResolvedValue([
      noteSummary({ id: 'n1', title: 'Plain note' }),
      noteSummary({ id: 'n2', title: 'Pinned note', isPinned: true }),
    ])

    renderNotes()
    await screen.findByText('Plain note')

    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(within(rows[0]).getByText('Pinned note')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Plain note')).toBeInTheDocument()
  })

  it('creates a new note and opens its editor', async () => {
    itemsMock.saveItem.mockResolvedValue(noteItem({ id: 'new1', title: 'Untitled note' }))

    renderNotes()
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith({ kind: 'note', title: 'Untitled note' }),
    )
    expect(await screen.findByText('Editor route')).toBeInTheDocument()
  })

  it('pins a note from its row menu', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary({ isPinned: false })])

    renderNotes()
    await screen.findByText('Alpha')
    await openRowMenu('Alpha')

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Pin' }))

    await waitFor(() => expect(itemsMock.setItemPinned).toHaveBeenCalledWith('n1', true))
  })

  it('moves a note to Trash after confirmation', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary()])

    renderNotes()
    await screen.findByText('Alpha')
    await openRowMenu('Alpha')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith(['n1']))
  })
})

describe('NoteEditor', () => {
  it('loads the note into the title and content fields', async () => {
    itemsMock.loadItem.mockResolvedValue(noteItem())

    renderEditor('n1')

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Alpha')
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveValue('Body text')
  })

  it('handles a missing note with a link back to the list', async () => {
    itemsMock.loadItem.mockRejectedValue(new Error('Item was not found'))

    renderEditor('missing')

    expect(await screen.findByRole('heading', { level: 1, name: 'Note not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Notes' })).toHaveAttribute('href', '/notes')
  })

  it('shows edited title and content in the fields', async () => {
    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Content' }), {
      target: { value: 'More text' },
    })

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Renamed')
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveValue('More text')
  })

  it('autosaves once after the debounce', async () => {
    vi.useFakeTimers()
    renderEditor('n1')
    await act(async () => {})

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed' },
    })

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(itemsMock.saveItem).toHaveBeenCalledTimes(1)
    expect(itemsMock.saveItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1', kind: 'note', title: 'Renamed', content: 'Body text' }),
    )
    expect(screen.getByText('Saved')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(800)
    })
    expect(itemsMock.saveItem).toHaveBeenCalledTimes(1)
  })

  it('flushes a pending save on window blur', async () => {
    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Blurred' },
    })
    fireEvent.blur(window)

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'n1', title: 'Blurred' }),
      ),
    )
    await waitFor(() => expect(itemsMock.saveItem).toHaveBeenCalledTimes(1))
  })

  it('saves tags and collection through their data calls', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      {
        id: 'c1',
        name: 'Work',
        icon: null,
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00Z',
        itemCount: 0,
      },
    ])

    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByRole('textbox', { name: 'New tag' }), {
      target: { value: 'work' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))

    await waitFor(() => expect(itemsMock.setItemTags).toHaveBeenCalledWith('n1', ['work']))

    fireEvent.click(screen.getByRole('button', { name: /Collection/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'Work' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'n1', collectionId: 'c1' }),
      ),
    )
  })

  it('moves the note to Trash and returns to the list', async () => {
    renderEditor('n1')
    fireEvent.click(await screen.findByRole('button', { name: 'Trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith(['n1']))
    expect(await screen.findByText('Notes route')).toBeInTheDocument()
  })
})

describe('SourcesPage', () => {
  function setupSource() {
    itemsMock.listItems.mockResolvedValue([
      noteSummary({ id: 's1', kind: 'source', title: 'Example' }),
    ])
    itemsMock.loadItem.mockResolvedValue(sourceItem())
  }

  it('lists sources with title, address, and summary', async () => {
    setupSource()

    renderSources()

    expect(await screen.findByText('Example')).toBeInTheDocument()
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(screen.getByText('A summary')).toBeInTheDocument()
  })

  it('opens a source through openSourceUrl', async () => {
    setupSource()

    renderSources()
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }))

    await waitFor(() => expect(filesMock.openSourceUrl).toHaveBeenCalledWith('s1'))
  })

  it('copies the address and confirms it', async () => {
    setupSource()

    renderSources()
    fireEvent.click(await screen.findByRole('button', { name: 'Copy address' }))

    await waitFor(() =>
      expect(window.navigator.clipboard.writeText as Mock).toHaveBeenCalledWith(
        'https://example.com',
      ),
    )
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('loads the item when editing', async () => {
    setupSource()

    renderSources()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))

    expect(await screen.findByRole('heading', { name: 'Edit source' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue('https://example.com')
    expect(itemsMock.loadItem).toHaveBeenCalledWith('s1')
  })

  it('removes a source after confirmation', async () => {
    setupSource()

    renderSources()
    fireEvent.click(await screen.findByRole('button', { name: 'Trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() => expect(itemsMock.trashItems).toHaveBeenCalledWith(['s1']))
  })
})

describe('SaveSourceDialog', () => {
  it('rejects a bad address and saves a valid source', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()

    render(<SaveSourceDialog itemId={null} open onClose={onClose} onSaved={onSaved} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Example' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Address' }), {
      target: { value: 'example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Address must start with http:// or https://.'),
    ).toBeInTheDocument()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Address' }), {
      target: { value: 'https://example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'source',
          title: 'Example',
          url: 'https://example.com',
        }),
      ),
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('requires an address and a title', async () => {
    render(<SaveSourceDialog itemId={null} open onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Address is required.')).toBeInTheDocument()
    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
  })
})
