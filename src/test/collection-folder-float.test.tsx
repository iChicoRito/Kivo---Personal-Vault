import '@testing-library/jest-dom/vitest'

import { EyeIcon, NoteEditIcon } from '@hugeicons/core-free-icons'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemCardAction } from '../components/items/ItemCard'
import type { Collection } from '../data/collections'
import type { ItemSummary } from '../data/items'

const defaultActions: ItemCardAction[] = [
  { id: 'view', label: 'View items in Work', icon: EyeIcon },
  { id: 'rename', label: 'Rename Work', icon: NoteEditIcon },
]

const collectionsMock = vi.hoisted(() => ({
  verifyCollectionSecret: vi.fn(),
}))

vi.mock('../data/collections', () => collectionsMock)

import { CollectionFolderFloat } from '../features/collections/CollectionFolderFloat'
import { UnlockDialog } from '../features/collections/UnlockDialog'

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Work',
    icon: null,
    protection: 'none',
    sortOrder: 0,
    createdAt: '2026-09-10T11:20:00.000Z',
    itemCount: 2,
    ...overrides,
  }
}

function item(overrides: Partial<ItemSummary> = {}): ItemSummary {
  return {
    id: 'item-1',
    kind: 'note',
    title: 'Alpha',
    isFavorite: false,
    collectionId: 'col-1',
    updatedAt: '2026-09-16T14:05:00.000Z',
    fileMissing: false,
    isPinned: false,
    file: null,
    content: null,
    ...overrides,
  }
}

function renderFolder(overrides: {
  collection?: Collection
  items?: ItemSummary[]
  locked?: boolean
  actions?: ItemCardAction[]
  onAction?: (id: string) => void
  onOpenCollection?: (collection: Collection) => void
  onOpenItem?: (item: ItemSummary) => void
} = {}) {
  const target = overrides.collection ?? collection()

  return render(
    <CollectionFolderFloat
      actions={overrides.actions ?? defaultActions}
      collection={target}
      items={overrides.items ?? [item({ id: 'a', title: 'Alpha' }), item({ id: 'b', title: 'Beta' })]}
      locked={overrides.locked ?? false}
      onAction={overrides.onAction ?? vi.fn()}
      onOpenCollection={overrides.onOpenCollection ?? vi.fn()}
      onOpenItem={overrides.onOpenItem ?? vi.fn()}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  collectionsMock.verifyCollectionSecret.mockResolvedValue(true)
})

describe('CollectionFolderFloat', () => {
  it('renders the Collection chip, the name, and the count copy', () => {
    renderFolder()

    expect(screen.getByText('Collection')).toBeInTheDocument()

    const nameButton = screen.getByRole('button', { name: 'Open collection Work' })

    expect(within(nameButton).getByText('Work')).toBeInTheDocument()
    expect(within(nameButton).getByText('2 Items on this collection')).toBeInTheDocument()
  })

  it('swaps the chip for Protected when the collection has a secret', () => {
    renderFolder({ collection: collection({ protection: 'password' }) })

    expect(screen.getByText('Protected')).toBeInTheDocument()
    expect(screen.queryByText('Collection')).not.toBeInTheDocument()
  })

  it('maps the first four titles into pills and folds the rest into one', () => {
    const titles = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']
    const items = titles.map((title, index) => item({ id: `item-${index}`, title }))

    const view = renderFolder({ items })

    const pills = Array.from(view.container.querySelectorAll('.folder-float__item'))

    expect(pills).toHaveLength(5)
    expect(pills.map((pill) => pill.textContent)).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
      'and 4 more',
    ])
  })

  it('reveals the pills from the trigger and opens the chosen item', () => {
    const onOpenCollection = vi.fn()
    const onOpenItem = vi.fn()
    const items = [item({ id: 'a', title: 'Alpha' }), item({ id: 'b', title: 'Beta' })]

    const view = renderFolder({ items, onOpenCollection, onOpenItem })

    const trigger = screen.getByRole('button', { name: 'Work, 2 Items on this collection' })
    const pills = Array.from(view.container.querySelectorAll('.folder-float__item'))

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(pills).toHaveLength(2)

    for (const pill of pills) {
      expect(pill).toHaveAttribute('tabindex', '-1')
      expect(pill).toHaveAttribute('aria-hidden', 'true')
    }

    expect(screen.queryByRole('button', { name: 'Alpha' })).not.toBeInTheDocument()

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    for (const pill of pills) {
      expect(pill).toHaveAttribute('tabindex', '0')
      expect(pill).toHaveAttribute('aria-hidden', 'false')
    }

    // The trigger press counts as a card press, so clear it before the pill click.
    onOpenCollection.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))

    expect(onOpenItem).toHaveBeenCalledWith(items[0])
    expect(onOpenCollection).not.toHaveBeenCalled()
  })

  it('opens the collection from the and N more pill', () => {
    const onOpenCollection = vi.fn()
    const target = collection({ itemCount: 7 })
    const items = Array.from({ length: 7 }, (_, index) =>
      item({ id: `item-${index}`, title: `Item ${index + 1}` }),
    )

    renderFolder({ collection: target, items, onOpenCollection })

    fireEvent.click(screen.getByRole('button', { name: 'Work, 7 Items on this collection' }))
    fireEvent.click(screen.getByRole('button', { name: 'and 3 more' }))

    expect(onOpenCollection).toHaveBeenCalledWith(target)
  })

  it('opens the collection from the name button', () => {
    const onOpenCollection = vi.fn()
    const target = collection()

    renderFolder({ collection: target, onOpenCollection })

    fireEvent.click(screen.getByRole('button', { name: 'Open collection Work' }))

    expect(onOpenCollection).toHaveBeenCalledWith(target)
  })

  it('opens the collection from anywhere else on the card', () => {
    const onOpenCollection = vi.fn()
    const target = collection()

    const view = renderFolder({ collection: target, onOpenCollection })

    fireEvent.click(view.container.querySelector('.kivo-collection-card')!)

    expect(onOpenCollection).toHaveBeenCalledWith(target)
  })

  it('offers the collection actions on a right click', async () => {
    const onAction = vi.fn()

    const view = renderFolder({ onAction })

    fireEvent.contextMenu(view.container.querySelector('.kivo-collection-card')!)

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename Work' }))

    expect(onAction).toHaveBeenCalledWith('rename')
  })

  it('keeps a locked collection bare so no title reaches the DOM', () => {
    const view = renderFolder({
      collection: collection({ protection: 'pin' }),
      items: [item({ id: 'a', title: 'Alpha' }), item({ id: 'b', title: 'Beta' })],
      locked: true,
    })

    expect(screen.getByText('Protected')).toBeInTheDocument()
    expect(view.container.querySelectorAll('.folder-float__item')).toHaveLength(0)
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'and 3 more' })).not.toBeInTheDocument()
  })
})

describe('UnlockDialog', () => {
  const PASSWORD_COLLECTION = collection({ id: 'col-pw', protection: 'password' })
  const PIN_COLLECTION = collection({ id: 'col-pin', protection: 'pin' })

  it('refuses an empty submit without checking the secret', () => {
    render(<UnlockDialog collection={PASSWORD_COLLECTION} onCancel={vi.fn()} onUnlocked={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(screen.getByText('Enter the password.')).toBeInTheDocument()
    expect(collectionsMock.verifyCollectionSecret).not.toHaveBeenCalled()
  })

  it('shows the wrong-secret message and keeps the dialog open', async () => {
    collectionsMock.verifyCollectionSecret.mockResolvedValue(false)

    render(<UnlockDialog collection={PASSWORD_COLLECTION} onCancel={vi.fn()} onUnlocked={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input[type="password"]' }), {
      target: { value: 'nope' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('That password did not match. Try again.')).toBeInTheDocument()
    expect(collectionsMock.verifyCollectionSecret).toHaveBeenCalledWith(PASSWORD_COLLECTION.id, 'nope')
  })

  it('shows the check-error message when verifying throws', async () => {
    collectionsMock.verifyCollectionSecret.mockRejectedValue(new Error('boom'))

    render(<UnlockDialog collection={PASSWORD_COLLECTION} onCancel={vi.fn()} onUnlocked={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input[type="password"]' }), {
      target: { value: 'nope' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('We could not check the password. Try again.')).toBeInTheDocument()
  })

  it('calls onUnlocked with the collection id on success', async () => {
    collectionsMock.verifyCollectionSecret.mockResolvedValue(true)
    const onUnlocked = vi.fn()

    render(<UnlockDialog collection={PASSWORD_COLLECTION} onCancel={vi.fn()} onUnlocked={onUnlocked} />)

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input[type="password"]' }), {
      target: { value: 'open-sesame' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    await waitFor(() => expect(onUnlocked).toHaveBeenCalledWith(PASSWORD_COLLECTION.id))
  })

  it('shows a password field for a password collection and a PIN field for a PIN collection', () => {
    const { rerender } = render(
      <UnlockDialog collection={PASSWORD_COLLECTION} onCancel={vi.fn()} onUnlocked={vi.fn()} />,
    )

    expect(
      screen.getByLabelText('Password', { selector: 'input[type="password"]' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Collection PIN')).not.toBeInTheDocument()

    rerender(<UnlockDialog collection={PIN_COLLECTION} onCancel={vi.fn()} onUnlocked={vi.fn()} />)

    expect(screen.getByLabelText('Collection PIN')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Password', { selector: 'input[type="password"]' }),
    ).not.toBeInTheDocument()
  })

  it('clears the field and the error when the collection changes', async () => {
    collectionsMock.verifyCollectionSecret.mockResolvedValue(false)

    const { rerender } = render(
      <UnlockDialog collection={PASSWORD_COLLECTION} onCancel={vi.fn()} onUnlocked={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('Password', { selector: 'input[type="password"]' }), {
      target: { value: 'nope' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('That password did not match. Try again.')).toBeInTheDocument()

    rerender(
      <UnlockDialog
        collection={collection({ id: 'col-2', protection: 'password' })}
        onCancel={vi.fn()}
        onUnlocked={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Password', { selector: 'input[type="password"]' })).toHaveValue('')
    expect(screen.queryByText('That password did not match. Try again.')).not.toBeInTheDocument()
  })
})
