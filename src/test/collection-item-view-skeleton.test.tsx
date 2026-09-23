import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ItemSummary } from '../data/items'
import { CollectionItemView } from '../features/collections/CollectionItemView'

const SOURCE: ItemSummary = {
  id: 'source-1',
  kind: 'source',
  title: 'Spec sheet',
  isFavorite: false,
  collectionId: 'collection-1',
  updatedAt: '2026-09-16T14:05:00.000Z',
  fileMissing: false,
  isPinned: false,
  file: null,
  content: null,
}

describe('CollectionItemView loading skeleton', () => {
  it.each(['grid', 'list'] as const)('shows the source-address placeholder in %s view', (view) => {
    const { container } = render(
      <CollectionItemView address={undefined} item={SOURCE} view={view} onOpen={() => undefined} />,
    )

    const card = screen.getByRole('button', { name: 'Spec sheet' })

    expect(card.querySelector('.skeleton')).toBeInTheDocument()
    expect(container.querySelector('.skeleton')).toBeInTheDocument()
  })
})
