import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Collection } from '../data/collections'

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
}))

const itemsMock = vi.hoisted(() => ({
  moveItemsToCollection: vi.fn(),
}))

vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/items', () => itemsMock)

import { CollectionFolderPanel } from '../features/collections/CollectionFolderPanel'
import {
  ITEM_DROPPED_EVENT,
  ITEM_DRAG_END_EVENT,
  ITEM_DRAG_OVER_EVENT,
  ITEM_DRAG_START_EVENT,
} from '../features/collections/itemDrag'

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Work',
    icon: null,
    sortOrder: 0,
    createdAt: '2026-09-10T11:20:00.000Z',
    itemCount: 1,
    ...overrides,
  }
}

function dragOver(collectionId: string | null) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent(ITEM_DRAG_OVER_EVENT, { detail: { collectionId } }),
    )
  })
}

async function dropItem(itemId: string, collectionId: string) {
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent(ITEM_DROPPED_EVENT, { detail: { itemId, collectionId } }),
    )
  })
}

function findRow(panel: HTMLElement, name: string) {
  const row = within(panel).getByRole('button', { name: `Open collection ${name}` }).closest('li')

  if (!row) throw new Error('The collection row is missing.')

  return row
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={['/notes']}>
      <Routes>
        <Route path="/notes" element={<CollectionFolderPanel />} />
        <Route path="/collections" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  collectionsMock.listCollections.mockResolvedValue([])
  itemsMock.moveItemsToCollection.mockResolvedValue(undefined)
})

describe('CollectionFolderPanel', () => {
  it('renders nothing while the collections load', () => {
    collectionsMock.listCollections.mockReturnValue(new Promise(() => undefined))

    renderPanel()

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('renders nothing when every collection is empty', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 0 }),
      collection({ id: 'col-2', name: 'Reading', itemCount: 0 }),
    ])

    const view = renderPanel()

    await waitFor(() => expect(collectionsMock.listCollections).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(view.container).toBeEmptyDOMElement()
  })

  it('renders only collections that hold items, with the count copy', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 1 }),
      collection({ id: 'col-2', name: 'Reading', itemCount: 2 }),
      collection({ id: 'col-3', name: 'Empty', itemCount: 0 }),
    ])

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })

    expect(within(panel).getByText('Work')).toBeInTheDocument()
    expect(within(panel).getByText('Reading')).toBeInTheDocument()
    expect(within(panel).queryByText('Empty')).not.toBeInTheDocument()

    expect(within(panel).getByText('1 Item')).toBeInTheDocument()
    expect(within(panel).getByText('2 Items')).toBeInTheDocument()

    expect(within(panel).getByRole('button', { name: 'Open collection Work' })).toBeInTheDocument()
    expect(
      within(panel).getByRole('button', { name: 'Open collection Reading' }),
    ).toBeInTheDocument()
    expect(
      within(panel).queryByRole('button', { name: 'Open collection Empty' }),
    ).not.toBeInTheDocument()
  })

  it('collapses to a rail that still opens collections, then expands again', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 1 }),
    ])

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })
    const toggle = within(panel).getByRole('button', { name: 'Collapse collection folder' })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveClass('w-80')

    fireEvent.click(toggle)

    const collapsedToggle = within(panel).getByRole('button', {
      name: 'Expand collection folder',
    })

    expect(collapsedToggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveClass('w-[4.5rem]')
    expect(within(panel).getByRole('button', { name: 'Open collection Work' })).toBeInTheDocument()

    fireEvent.click(collapsedToggle)

    expect(
      within(panel).getByRole('button', { name: 'Collapse collection folder' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(within(panel).getByRole('button', { name: 'Open collection Work' })).toBeInTheDocument()
  })

  it('shows the collection name in a tooltip on the collapsed rail', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 1 }),
    ])

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })

    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse collection folder' }))

    const tile = within(panel).getByRole('button', { name: 'Open collection Work' })

    fireEvent.pointerDown(tile)
    fireEvent.pointerEnter(tile)

    expect(await screen.findByRole('tooltip', {}, { timeout: 3000 })).toHaveTextContent('Work')
  })

  it('opens the collections page for the clicked collection', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-9', name: 'Work', itemCount: 1 }),
    ])

    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: 'Open collection Work' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/collections?collection=col-9'),
    )
  })

  it('renders nothing when the collections fail to load', async () => {
    collectionsMock.listCollections.mockRejectedValue(new Error('boom'))

    renderPanel()

    await waitFor(() => expect(collectionsMock.listCollections).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('lists empty collections and expands while a drag is active', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 1 }),
      collection({ id: 'col-2', name: 'Reading', itemCount: 0 }),
    ])

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })

    expect(within(panel).queryByText('Reading')).not.toBeInTheDocument()

    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse collection folder' }))
    expect(panel).toHaveClass('w-[4.5rem]')

    act(() => {
      window.dispatchEvent(new Event(ITEM_DRAG_START_EVENT))
    })

    expect(within(panel).getByText('Reading')).toBeInTheDocument()
    expect(panel).toHaveClass('w-80')

    act(() => {
      window.dispatchEvent(new Event(ITEM_DRAG_END_EVENT))
    })

    expect(within(panel).queryByText('Reading')).not.toBeInTheDocument()
    expect(panel).toHaveClass('w-[4.5rem]')
  })

  it('marks the collection under the pointer while an item is dragged over it', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 1 }),
    ])

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })
    const row = findRow(panel, 'Work')

    dragOver('col-1')
    expect(row).toHaveClass('outline-focus')

    dragOver(null)
    expect(row).not.toHaveClass('outline-focus')
  })

  it('moves the dropped item into that collection and reports it', async () => {
    collectionsMock.listCollections
      .mockResolvedValueOnce([collection({ id: 'col-1', name: 'Work', itemCount: 1 })])
      .mockResolvedValueOnce([collection({ id: 'col-1', name: 'Work', itemCount: 2 })])

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })
    const row = findRow(panel, 'Work')

    dragOver('col-1')
    expect(row).toHaveClass('outline-focus')

    await dropItem('note-1', 'col-1')

    expect(itemsMock.moveItemsToCollection).toHaveBeenCalledWith(['note-1'], 'col-1')
    expect(await within(panel).findByText('Moved to Work')).toBeInTheDocument()
    await waitFor(() => expect(within(panel).getByText('2 Items')).toBeInTheDocument())
    expect(collectionsMock.listCollections).toHaveBeenCalledTimes(2)
    expect(row).not.toHaveClass('outline-focus')
  })

  it('keeps the panel and reports a move that fails', async () => {
    collectionsMock.listCollections.mockResolvedValue([
      collection({ id: 'col-1', name: 'Work', itemCount: 1 }),
    ])
    itemsMock.moveItemsToCollection.mockRejectedValue(new Error('boom'))

    renderPanel()

    const panel = await screen.findByRole('complementary', { name: 'Collection folders' })
    const row = findRow(panel, 'Work')

    await dropItem('note-1', 'col-1')

    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'Could not move this item. Try again.',
    )
    expect(within(panel).getByText('Work')).toBeInTheDocument()
    expect(row).not.toHaveClass('outline-focus')
  })
})
