import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemSummary } from '../data/items'

const itemsMock = vi.hoisted(() => ({
  listItems: vi.fn(),
  setItemsFavorite: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../features/items/ItemDetailsDialog', () => ({ ItemDetailsDialog: () => null }))

import { FavoritesPage } from '../features/favorites/FavoritesPage'

const FAVORITE_ITEM: ItemSummary = {
  id: 'favorite-1',
  kind: 'note',
  title: 'Favorite note',
  isFavorite: true,
  collectionId: null,
  updatedAt: '2026-09-16T10:00:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: null,
  content: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([FAVORITE_ITEM])
  itemsMock.setItemsFavorite.mockResolvedValue(undefined)
})

describe('FavoritesPage', () => {
  it('shows item-shaped placeholders while loading and keeps the filter available', async () => {
    let resolveItems!: (items: ItemSummary[]) => void
    itemsMock.listItems.mockReturnValue(
      new Promise<ItemSummary[]>((resolve) => {
        resolveItems = resolve
      }),
    )

    render(<FavoritesPage />)

    const loadingStatus = screen.getByRole('status', { name: 'Loading favorites' })
    expect(loadingStatus.querySelectorAll('li')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Favorites' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /All types/ })).toBeInTheDocument()

    await act(async () => resolveItems([FAVORITE_ITEM]))

    expect(await screen.findByText('Favorite note')).toBeInTheDocument()
  })

  it('shows an error and retries loading favorites', async () => {
    itemsMock.listItems
      .mockRejectedValueOnce(new Error('list failed'))
      .mockResolvedValueOnce([FAVORITE_ITEM])

    render(<FavoritesPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Your favorites could not load')

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Favorite note')).toBeInTheDocument()
    expect(itemsMock.listItems).toHaveBeenCalledTimes(2)
  })

  it('shows the empty message when there are no favorites', async () => {
    itemsMock.listItems.mockResolvedValue([])

    render(<FavoritesPage />)

    expect(
      await screen.findByText('No favorites yet. Items marked as favorites will appear here.'),
    ).toBeInTheDocument()
  })
})
