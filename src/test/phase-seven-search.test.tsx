import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const itemsMock = vi.hoisted(() => ({
  listItems: vi.fn(),
  loadItem: vi.fn(),
  saveItem: vi.fn(),
  setItemTags: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
}))

const tagsMock = vi.hoisted(() => ({ listTags: vi.fn() }))
const collectionsMock = vi.hoisted(() => ({ listCollections: vi.fn() }))
const insightsMock = vi.hoisted(() => ({ searchRelatedItems: vi.fn() }))

const feedbackMock = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  trashWithUndo: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/insights', () => insightsMock)
vi.mock('../lib/feedback', () => feedbackMock)

import type { ItemSummary, VaultItem } from '../data/items'
import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'
import { NavbarSearch } from '../app/NavbarSearch'

const RELATED: ItemSummary = {
  id: 'rel-1',
  kind: 'source',
  title: 'Beta source',
  isFavorite: false,
  collectionId: null,
  updatedAt: '2026-01-02T00:00:00Z',
  fileMissing: false,
  isPinned: false,
  content: null,
  file: null,
}

const RELATED_ITEM: VaultItem = {
  id: 'rel-1',
  kind: 'source',
  title: 'Beta source',
  description: '',
  content: '',
  url: 'https://example.com',
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  tags: [],
  file: null,
  fileMissing: false,
}

function renderSearch(semanticSearch: boolean) {
  render(
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, semanticSearch }}>
      <NavbarSearch />
    </PreferencesProvider>,
  )
}

async function typeQuery(value: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Search the vault' }))
  fireEvent.change(await screen.findByRole('textbox', { name: 'Search' }), {
    target: { value },
  })
}

async function openFiltersMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
  await screen.findByRole('menuitem', { name: 'Kind' })
}

// Open a Filters submenu with the keyboard: ArrowRight moves focus into the
// submenu synchronously, while a click races React Aria's popover focus.
async function chooseFilterItem(submenuName: string, itemName: string) {
  const trigger = screen.getByRole('menuitem', { name: submenuName })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowRight' })

  const item = await screen.findByRole('menuitemradio', { name: itemName })
  fireEvent.keyDown(item, { key: 'Enter' })
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([])
  itemsMock.loadItem.mockResolvedValue({ ...RELATED_ITEM })
  tagsMock.listTags.mockResolvedValue([])
  collectionsMock.listCollections.mockResolvedValue([])
  insightsMock.searchRelatedItems.mockResolvedValue([])
})

describe('NavbarSearch related group', () => {
  it('adds a related group with matched terms when the switch is on', async () => {
    insightsMock.searchRelatedItems.mockResolvedValue([
      { item: RELATED, score: 1.2, matchedTerms: ['budget', 'plan'] },
    ])

    renderSearch(true)
    await typeQuery('budget')

    await waitFor(() => expect(insightsMock.searchRelatedItems).toHaveBeenCalledWith('budget', undefined))
    expect(await screen.findByText('Related on this device')).toBeInTheDocument()
    expect(screen.getByText('Matches shared words. No text is generated.')).toBeInTheDocument()
    expect(await screen.findByText('Beta source')).toBeInTheDocument()
    expect(screen.getByText('budget, plan')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Related items' })).getByText('Source'),
    ).toBeInTheDocument()
  })

  it('opens a related row through the item details dialog', async () => {
    insightsMock.searchRelatedItems.mockResolvedValue([
      { item: RELATED, score: 1.2, matchedTerms: ['budget'] },
    ])

    renderSearch(true)
    await typeQuery('budget')

    fireEvent.click(await screen.findByRole('button', { name: /Beta source/ }))

    expect(await screen.findByRole('heading', { name: 'Item details' })).toBeInTheDocument()
    expect(itemsMock.loadItem).toHaveBeenCalledWith(RELATED.id)
  })

  it('narrows the related group with one filter', async () => {
    renderSearch(true)
    await typeQuery('budget')
    await waitFor(() => expect(insightsMock.searchRelatedItems).toHaveBeenCalled())

    await openFiltersMenu()
    await chooseFilterItem('Kind', 'Notes')

    await waitFor(() =>
      expect(insightsMock.searchRelatedItems).toHaveBeenLastCalledWith('budget', { kind: 'note' }),
    )
  })

  it('renders no related group and never calls the command when the switch is off', async () => {
    renderSearch(false)
    await typeQuery('budget')

    await waitFor(() => expect(itemsMock.listItems).toHaveBeenCalledWith({ query: 'budget' }))
    expect(screen.queryByText('Related on this device')).not.toBeInTheDocument()
    expect(insightsMock.searchRelatedItems).not.toHaveBeenCalled()
  })
})
