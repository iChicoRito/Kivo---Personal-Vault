import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import type { Mock } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
}))

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
}))

const settingsMock = vi.hoisted(() => ({
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
}))

const feedbackMock = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  trashWithUndo: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/settings', () => settingsMock)
vi.mock('../lib/feedback', () => feedbackMock)

import type { Collection } from '../data/collections'
import type { ItemSummary, VaultItem } from '../data/items'
import type { Preferences } from '../data/settings'
import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'
import {
  ITEM_DRAG_GHOST_CLASS,
  ITEM_DRAG_GHOST_OVER_CLASS,
  ITEM_DRAG_SOURCE_CLASS,
} from '../features/collections/itemDrag'
import { NoteEditor } from '../features/notes/NoteEditor'
import { NotesPage } from '../features/notes/NotesPage'
import { SaveSourceDialog } from '../features/sources/SaveSourceDialog'
import { SourcesPage } from '../features/sources/SourcesPage'
import { VAULT_CHANGED_EVENT } from '../data/events'

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
    content: null,
    ...overrides,
  }
}

const EMPTY_NOTE_MESSAGE =
  "Your note currently doesn't have any content. Your content will be displayed here."

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

function renderNotes(preferences: Partial<Preferences> = {}) {
  return render(
    <MemoryRouter initialEntries={['/notes']}>
      <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, ...preferences }}>
        <Routes>
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/new" element={<div>New note route</div>} />
          <Route path="/notes/:id" element={<div>Editor route</div>} />
        </Routes>
      </PreferencesProvider>
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

// The draft editor keeps its local state and swaps the URL for the saved note's
// route, so a marker beside the routes reports where the editor now sits.
function LocationMarker() {
  const { pathname } = useLocation()

  return <span data-testid="location">{pathname}</span>
}

function renderDraftEditor() {
  return render(
    <MemoryRouter initialEntries={['/notes/new']}>
      <LocationMarker />
      <Routes>
        <Route path="/notes" element={<div>Notes route</div>} />
        <Route path="/notes/:id" element={<NoteEditor />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderSources(preferences: Partial<Preferences> = {}) {
  return render(
    <MemoryRouter initialEntries={['/sources']}>
      <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, ...preferences }}>
        <Routes>
          <Route path="/sources" element={<SourcesPage />} />
        </Routes>
      </PreferencesProvider>
    </MemoryRouter>,
  )
}

// Rows open their action menu on a right click. A title can repeat in the
// collection panel, so pick the first match inside an item card.
async function openRowMenu(title: string) {
  const titleElement = screen
    .getAllByText(title)
    .find((element) => element.closest('.kivo-item-card') !== null)

  if (!titleElement) throw new Error(`The row for "${title}" is missing.`)

  fireEvent.contextMenu(titleElement)
}

function findCardRow(title: string) {
  const row = screen
    .getAllByText(title)
    .map((element) => element.closest('li'))
    .find((element): element is HTMLLIElement => element !== null)

  if (!row) throw new Error('The item row is missing.')

  return row
}

function collectionSummary(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Work',
    icon: null,
    protection: 'none',
    sortOrder: 0,
    createdAt: '2026-09-10T11:20:00.000Z',
    itemCount: 1,
    ...overrides,
  }
}

// The panel head is a BranchedMenu section head, so the element that takes a
// drop is the section wrapper around the head and its item rows.
function findCollectionRow(panel: HTMLElement, name: string) {
  const row = within(panel)
    .getByRole('button', { name: new RegExp(`^${name} `) })
    .closest('[data-collection-drop]')

  if (!row) throw new Error('The collection row is missing.')

  return row
}

function findLoadingStatus(copy: string) {
  const status = screen
    .getAllByRole('status')
    .find((element) => element.textContent?.includes(copy))

  if (!status) throw new Error(`Loading status for "${copy}" was not found.`)

  return status
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

  settingsMock.loadPreferences.mockResolvedValue(DEFAULT_PREFERENCES)
  settingsMock.savePreferences.mockResolvedValue(undefined)

  feedbackMock.trashWithUndo.mockResolvedValue(true)
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

  it.each([
    ['grid', ['sm:grid-cols-2', 'xl:grid-cols-3']],
    ['list', ['gap-2']],
  ] as const)('shows note skeletons in the selected %s layout', (view, classes) => {
    itemsMock.listItems.mockReturnValue(new Promise(() => undefined))

    renderNotes({ notesView: view })

    const status = findLoadingStatus('Loading your notes')
    const loadingList = status.querySelector('ul')

    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(loadingList).not.toBeNull()
    expect(loadingList).toHaveClass(...classes)
    expect(loadingList?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(loadingList?.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Grid' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'List' })).toBeInTheDocument()
  })

  it('shows the empty state when there are no notes', async () => {
    itemsMock.listItems.mockResolvedValue([])

    renderNotes()

    expect(
      await screen.findByRole('heading', { level: 3, name: 'No Notes Yet' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "You haven't created any notes yet. Get started by creating your first note.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Note' })).toBeInTheDocument()
  })

  it('creates a note from the empty state action', async () => {
    renderNotes()
    fireEvent.click(await screen.findByRole('button', { name: 'Create Note' }))

    expect(await screen.findByText('New note route')).toBeInTheDocument()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
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

  it('refreshes the list when the vault reports a change', async () => {
    itemsMock.listItems
      .mockResolvedValueOnce([noteSummary({ id: 'n1', title: 'Alpha' })])
      .mockResolvedValueOnce([
        noteSummary({ id: 'n1', title: 'Alpha' }),
        noteSummary({ id: 'n2', title: 'Beta' }),
      ])

    renderNotes()
    await screen.findByText('Alpha')
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event(VAULT_CHANGED_EVENT))
    })

    expect(await screen.findByText('Beta')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledTimes(2)
  })

  it('passes the search text as a query filter', async () => {
    renderNotes()
    await screen.findByRole('heading', { level: 3, name: 'No Notes Yet' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'roadmap' },
    })

    await waitFor(() =>
      expect(itemsMock.listItems).toHaveBeenLastCalledWith({ kind: 'note', query: 'roadmap' }),
    )
  })

  it('shows the no-match line when a search finds nothing', async () => {
    renderNotes()
    await screen.findByRole('heading', { level: 3, name: 'No Notes Yet' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'roadmap' },
    })

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No notes match your search.' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('No Notes Yet')).not.toBeInTheDocument()
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

  it('shows a status bar and chips for each note state', async () => {
    itemsMock.listItems.mockResolvedValue([
      noteSummary({ id: 'n1', title: 'Plain note' }),
      noteSummary({ id: 'n2', title: 'Pinned note', isPinned: true }),
      noteSummary({ id: 'n3', title: 'Favorite note', isFavorite: true }),
      noteSummary({ id: 'n4', title: 'Both note', isPinned: true, isFavorite: true }),
    ])

    const view = renderNotes()
    await screen.findByText('Plain note')

    expect(view.container.querySelectorAll('[data-note-status="plain"]')).toHaveLength(1)
    expect(view.container.querySelectorAll('[data-note-status="pinned"]')).toHaveLength(1)
    expect(view.container.querySelectorAll('[data-note-status="favorite"]')).toHaveLength(1)
    expect(view.container.querySelectorAll('[data-note-status="pinned-favorite"]')).toHaveLength(1)

    const list = screen.getByRole('list')
    expect(within(list).getByText('Notes')).toBeInTheDocument()
    expect(within(list).getAllByText('Pinned')).toHaveLength(2)
    expect(within(list).getAllByText('Favorite')).toHaveLength(2)
  })

  it('shows the note preview on a grid card and opens the editor from the card', async () => {
    itemsMock.listItems.mockResolvedValue([
      noteSummary({ content: '<p>Hello <strong>there</strong></p>' }),
    ])

    renderNotes()
    await screen.findByText('Alpha')

    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Note' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions for Alpha' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(await screen.findByText('Editor route')).toBeInTheDocument()
  })

  it('shows the empty note message on a grid card but not on a list row', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary({ content: null })])

    const grid = renderNotes()
    await screen.findByText('Alpha')
    expect(screen.getByText(EMPTY_NOTE_MESSAGE)).toBeInTheDocument()
    grid.unmount()

    renderNotes({ notesView: 'list' })
    await screen.findByText('Alpha')
    expect(screen.queryByText(EMPTY_NOTE_MESSAGE)).not.toBeInTheDocument()
  })

  it('remembers the list layout when the view toggle changes', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary()])

    renderNotes()
    await screen.findByText('Alpha')

    expect(screen.getByRole('tab', { name: 'Grid' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('list').closest('[data-slot="scroll-shadow"]')).not.toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'List' }))

    await waitFor(() =>
      expect(settingsMock.savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ notesView: 'list' }),
      ),
    )
    expect(screen.getByRole('list').closest('[data-slot="scroll-shadow"]')).not.toBeNull()
  })

  it('creates a new note and opens its editor', async () => {
    renderNotes()
    fireEvent.click(screen.getByRole('button', { name: 'New Note' }))

    expect(await screen.findByText('New note route')).toBeInTheDocument()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
  })

  it('pins a note from its row menu', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary({ isPinned: false })])

    renderNotes({ notesView: 'list' })
    await screen.findByText('Alpha')
    await openRowMenu('Alpha')

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Pin' }))

    await waitFor(() => expect(itemsMock.setItemPinned).toHaveBeenCalledWith('n1', true))
  })

  it('moves a note to Trash after confirmation', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary()])

    renderNotes({ notesView: 'list' })
    await screen.findByText('Alpha')
    await openRowMenu('Alpha')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() =>
      expect(feedbackMock.trashWithUndo).toHaveBeenCalledWith({ ids: ['n1'], label: 'Note' }),
    )
  })

  it('floats a note card toward a collection and drops it there', async () => {
    itemsMock.listItems.mockResolvedValue([noteSummary()])
    collectionsMock.listCollections.mockResolvedValue([collectionSummary()])

    renderNotes()
    // The panel repeats the note title under its collection, so wait for any match.
    await screen.findAllByText('Alpha')

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })
    const row = findCardRow('Alpha')

    fireEvent.pointerDown(row, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(row, { clientX: 40, clientY: 40 })

    const ghost = document.querySelector(`.${ITEM_DRAG_GHOST_CLASS}`)

    expect(ghost).not.toBeNull()
    expect(row).toHaveClass(ITEM_DRAG_SOURCE_CLASS)

    const target = findCollectionRow(panel, 'Work')

    fireEvent.pointerMove(target, { clientX: 40, clientY: 40 })
    expect(target).toHaveClass('outline-focus')
    expect(ghost).toHaveClass(ITEM_DRAG_GHOST_OVER_CLASS)

    fireEvent.pointerUp(target, { clientX: 40, clientY: 40 })

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith(['n1'], 'col-1'),
    )
    expect(row).not.toHaveClass(ITEM_DRAG_SOURCE_CLASS)
    await waitFor(() => expect(document.querySelector(`.${ITEM_DRAG_GHOST_CLASS}`)).toBeNull())
  })
})

describe('NoteEditor', () => {
  it('shows title and body skeletons while the note loads', () => {
    itemsMock.loadItem.mockReturnValue(new Promise(() => undefined))

    renderEditor('n1')

    const status = findLoadingStatus('Loading your note')

    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('Loading your note')
    expect(status.querySelectorAll('.skeleton')).toHaveLength(2)
    expect(status.querySelector('.min-h-\\[24rem\\]')).not.toBeNull()
  })

  it('loads the note into the title field and the body editor', async () => {
    itemsMock.loadItem.mockResolvedValue(noteItem())

    renderEditor('n1')

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Alpha')
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveTextContent('Body text')
  })

  it('starts a new note as an empty draft with no saved record', async () => {
    renderDraftEditor()

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('')
    expect(screen.getByPlaceholderText('Untitled note')).toBeInTheDocument()
    expect(itemsMock.loadItem).not.toHaveBeenCalled()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Pin' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Note settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Note' })).toBeDisabled()
  })

  it('creates the note on the first change and moves the URL to the saved route', async () => {
    vi.useFakeTimers()
    itemsMock.saveItem.mockResolvedValue(noteItem({ id: 'new-1', title: 'Draft title' }))

    renderDraftEditor()
    await act(async () => {})

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Draft title' },
    })

    await act(async () => {
      vi.advanceTimersByTime(800)
    })
    await act(async () => {})

    expect(itemsMock.saveItem).toHaveBeenCalledTimes(1)
    expect(itemsMock.saveItem).toHaveBeenCalledWith({
      kind: 'note',
      title: 'Draft title',
      content: '',
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/notes/new-1')
  })

  it('leaves nothing behind when the draft closes without a change', async () => {
    vi.useFakeTimers()

    renderDraftEditor()
    await act(async () => {})

    fireEvent.blur(window)

    await act(async () => {})

    fireEvent.click(screen.getByRole('link', { name: 'Back' }))

    await act(async () => {})

    expect(itemsMock.saveItem).not.toHaveBeenCalled()
    expect(screen.getByText('Notes route')).toBeInTheDocument()
  })

  it('counts the characters in the note body', async () => {
    itemsMock.loadItem.mockResolvedValue(noteItem())

    renderEditor('n1')

    expect(await screen.findByText('Characters: 9/18000')).toBeInTheDocument()
  })

  it('wires the formatting toolbar to the note body', async () => {
    itemsMock.loadItem.mockResolvedValue(noteItem())

    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Content' })

    const bold = screen.getByRole('button', { name: 'Bold' })

    expect(bold).not.toHaveAttribute('data-selected', 'true')

    fireEvent.click(bold)

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('data-selected', 'true')
    expect(screen.getByRole('button', { name: 'Align center' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Align right' })).toBeInTheDocument()
  })

  it('formats the note body with headings, lists, quotes, and strikethrough', async () => {
    itemsMock.loadItem.mockResolvedValue(noteItem())

    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Content' })

    for (const name of ['Heading 2', 'Bullet list', 'Numbered list', 'Quote', 'Strikethrough']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }

    const bullets = screen.getByRole('button', { name: 'Bullet list' })

    expect(bullets).not.toHaveAttribute('data-selected', 'true')

    fireEvent.click(bullets)

    expect(screen.getByRole('button', { name: 'Bullet list' })).toHaveAttribute(
      'data-selected',
      'true',
    )
  })

  it('pins and favorites the note from the header group', async () => {
    itemsMock.loadItem.mockResolvedValue(noteItem())

    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    await waitFor(() => expect(itemsMock.setItemPinned).toHaveBeenCalledWith('n1', true))

    fireEvent.click(screen.getByRole('button', { name: 'Add to Favorite' }))
    await waitFor(() => expect(itemsMock.setItemsFavorite).toHaveBeenCalledWith(['n1'], true))
  })

  it('handles a missing note with a link back to the list', async () => {
    itemsMock.loadItem.mockRejectedValue(new Error('Item was not found'))

    renderEditor('missing')

    expect(await screen.findByRole('heading', { level: 1, name: 'Note not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Notes' })).toHaveAttribute('href', '/notes')
  })

  it('shows an edited title in the field', async () => {
    renderEditor('n1')
    await screen.findByRole('textbox', { name: 'Title' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed' },
    })

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Renamed')
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/notes')
  })

  it('shrinks the title font when the text outgrows the field', async () => {
    renderEditor('n1')
    const field = await screen.findByRole('textbox', { name: 'Title' })

    // jsdom lays nothing out, so the field is told how wide it is and how wide
    // its text is before each change.
    Object.defineProperty(field, 'clientWidth', { configurable: true, value: 400 })
    Object.defineProperty(field, 'scrollWidth', { configurable: true, value: 800 })

    fireEvent.change(field, { target: { value: 'A title that is too long' } })
    expect(field).toHaveStyle({ fontSize: '20px' })

    Object.defineProperty(field, 'scrollWidth', { configurable: true, value: 100000 })
    fireEvent.change(field, { target: { value: 'x'.repeat(120) } })
    expect(field).toHaveStyle({ fontSize: '16px' })

    Object.defineProperty(field, 'scrollWidth', { configurable: true, value: 200 })
    fireEvent.change(field, { target: { value: 'Short title' } })
    expect(field.style.fontSize).toBe('')
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

  it('saves a blank title under the untitled name', async () => {
    vi.useFakeTimers()
    renderEditor('n1')
    await act(async () => {})

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: '   ' },
    })

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(itemsMock.saveItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1', kind: 'note', title: 'Untitled note' }),
    )
  })

  it('clears the save error once a later save succeeds', async () => {
    vi.useFakeTimers()
    itemsMock.saveItem.mockRejectedValueOnce(new Error('Item title is required'))

    renderEditor('n1')
    await act(async () => {})

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed' },
    })

    await act(async () => {
      vi.advanceTimersByTime(800)
    })
    await act(async () => {})

    expect(screen.getByRole('alert')).toHaveTextContent('Kivo could not save this note')

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Renamed again' },
    })

    await act(async () => {
      vi.advanceTimersByTime(800)
    })

    expect(screen.queryByText(/Kivo could not save this note/)).not.toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
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

  it('keeps the stored note when development remounts the editor', async () => {
    // Every effect runs twice under StrictMode, so the blur cleanup flushes once
    // while the note is still loading. That early flush holds empty fields and
    // must not save over the stored note.
    let resolveLoad: (item: VaultItem) => void = () => undefined
    itemsMock.loadItem.mockImplementation(
      () =>
        new Promise<VaultItem>((resolve) => {
          resolveLoad = resolve
        }),
    )

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/notes/n1']}>
          <Routes>
            <Route path="/notes/:id" element={<NoteEditor />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    await act(async () => {
      resolveLoad(noteItem())
    })

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Alpha')
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
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

    fireEvent.change(screen.getByRole('textbox', { name: 'Tag name' }), {
      target: { value: 'work' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Tag' }))

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
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Note' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() =>
      expect(feedbackMock.trashWithUndo).toHaveBeenCalledWith({ ids: ['n1'], label: 'Note' }),
    )
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

  it('shows source skeletons in a list', () => {
    itemsMock.listItems.mockReturnValue(new Promise(() => undefined))

    renderSources()

    const status = findLoadingStatus('Loading your sources')
    const loadingList = status.querySelector('ul')

    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(loadingList).not.toBeNull()
    expect(loadingList).toHaveClass('gap-2')
    expect(loadingList?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(loadingList?.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'New Source' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Grid' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'List' })).not.toBeInTheDocument()
  })

  it('keeps the collection sidebar visible while sources load', async () => {
    itemsMock.listItems.mockReturnValue(new Promise(() => undefined))
    collectionsMock.listCollections.mockResolvedValue([collectionSummary()])

    renderSources()

    expect(
      await screen.findByRole('complementary', { name: 'Collection folders' }),
    ).toBeInTheDocument()
    expect(findLoadingStatus('Loading your sources').querySelector('ul')).toHaveClass('gap-2')
  })

  it('shows the title and the address on a source row without a Source chip', async () => {
    setupSource()

    renderSources()
    await screen.findByText('Example')

    const row = findCardRow('Example')

    expect(within(row).getByText('https://example.com')).toBeInTheDocument()
    expect(within(row).queryByText('Source')).not.toBeInTheDocument()
    expect(screen.queryByText('A summary')).not.toBeInTheDocument()
  })

  it('renders sources as rows with no view toggle', async () => {
    setupSource()

    renderSources()
    await screen.findByText('Example')

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByRole('list').closest('[data-slot="scroll-shadow"]')).not.toBeNull()
  })

  it('opens a source from the list row body', async () => {
    setupSource()

    renderSources()
    fireEvent.click(await screen.findByRole('button', { name: 'Example' }))

    await waitFor(() => expect(filesMock.openSourceUrl).toHaveBeenCalledWith('s1'))
  })

  it('edits a source from the row menu', async () => {
    setupSource()

    renderSources()
    await screen.findByText('Example')
    await openRowMenu('Example')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit source' }))

    expect(await screen.findByRole('heading', { name: 'Edit source' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue('https://example.com')
    expect(itemsMock.loadItem).toHaveBeenCalledWith('s1')
  })

  it('offers Move to collection and Move to trash in the row menu', async () => {
    setupSource()

    renderSources()
    await screen.findByText('Example')
    await openRowMenu('Example')

    expect(await screen.findByRole('menuitem', { name: 'Move to collection' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Move to trash' })).toBeInTheDocument()
  })

  it('moves a source to a collection from the row menu', async () => {
    setupSource()
    collectionsMock.listCollections.mockResolvedValue([collectionSummary()])

    renderSources()
    await screen.findByText('Example')
    await openRowMenu('Example')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to collection' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Collection/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'Work' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith(['s1'], 'col-1'),
    )
    await waitFor(() =>
      expect(feedbackMock.notifySuccess).toHaveBeenCalledWith('Source moved to collection'),
    )
  })

  it('moves a source to Trash from the row menu', async () => {
    setupSource()

    renderSources()
    await screen.findByText('Example')
    await openRowMenu('Example')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to trash' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to Trash' }))

    await waitFor(() =>
      expect(feedbackMock.trashWithUndo).toHaveBeenCalledWith({ ids: ['s1'], label: 'Source' }),
    )
  })

  it('shows the no-match line when a search finds nothing', async () => {
    renderSources()
    await screen.findByText('No sources yet.')

    fireEvent.change(screen.getByRole('textbox', { name: 'Search link' }), {
      target: { value: 'roadmap' },
    })

    expect(await screen.findByText('No sources match your search.')).toBeInTheDocument()
    expect(screen.queryByText('No sources yet.')).not.toBeInTheDocument()
  })

  it('floats a source card toward a collection and drops it there', async () => {
    setupSource()
    collectionsMock.listCollections.mockResolvedValue([collectionSummary()])

    renderSources()
    // The panel repeats the source title under its collection, so wait for any match.
    await screen.findAllByText('Example')

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })
    const row = findCardRow('Example')

    fireEvent.pointerDown(row, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(row, { clientX: 40, clientY: 40 })

    const ghost = document.querySelector(`.${ITEM_DRAG_GHOST_CLASS}`)

    expect(ghost).not.toBeNull()
    expect(row).toHaveClass(ITEM_DRAG_SOURCE_CLASS)

    const target = findCollectionRow(panel, 'Work')

    fireEvent.pointerMove(target, { clientX: 40, clientY: 40 })
    expect(target).toHaveClass('outline-focus')
    expect(ghost).toHaveClass(ITEM_DRAG_GHOST_OVER_CLASS)

    fireEvent.pointerUp(target, { clientX: 40, clientY: 40 })

    await waitFor(() =>
      expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith(['s1'], 'col-1'),
    )
    expect(row).not.toHaveClass(ITEM_DRAG_SOURCE_CLASS)
    await waitFor(() => expect(document.querySelector(`.${ITEM_DRAG_GHOST_CLASS}`)).toBeNull())
  })
})

describe('SaveSourceDialog', () => {
  it('rejects a bad address and saves a valid source', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()

    render(<SaveSourceDialog itemId={null} open onClose={onClose} onSaved={onSaved} />)

    expect(screen.queryByRole('textbox', { name: 'Personal note' })).not.toBeInTheDocument()

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
