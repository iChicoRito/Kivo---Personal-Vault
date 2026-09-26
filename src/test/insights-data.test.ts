import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  reindexItems,
  searchRelatedItems,
  suggestTags,
  summarizeItem,
  type RelatedResult,
} from '../data/insights'
import type { ItemSummary } from '../data/items'
import { getTauriInvoke } from './setup'

const ITEM: ItemSummary = {
  id: 'item-1',
  kind: 'note',
  title: 'Budget notes',
  isFavorite: false,
  collectionId: null,
  updatedAt: '2026-01-02T00:00:00Z',
  fileMissing: false,
  isPinned: false,
  content: null,
  file: null,
}

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('insights data contract', () => {
  it('passes the query and an optional filter through search_related_items', async () => {
    getTauriInvoke().mockResolvedValue([])

    await searchRelatedItems('budget', { kind: 'note', tag: 'bills', favorite: true })
    await searchRelatedItems('budget')

    expect(getTauriInvoke().mock.calls).toEqual([
      [
        'search_related_items',
        { input: { query: 'budget', filter: { kind: 'note', tag: 'bills', favorite: true } } },
      ],
      ['search_related_items', { input: { query: 'budget', filter: null } }],
    ])
  })

  it('returns the related result shape unchanged', async () => {
    const result: RelatedResult = { item: ITEM, score: 1.5, matchedTerms: ['budget'] }
    getTauriInvoke().mockResolvedValue([result])

    await expect(searchRelatedItems('budget')).resolves.toEqual([result])
  })

  it('calls reindex_items, suggest_tags, and summarize_item with the frozen shapes', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await reindexItems()
    await suggestTags('item-1')
    await summarizeItem('item-1')

    expect(getTauriInvoke().mock.calls).toEqual([
      ['reindex_items'],
      ['suggest_tags', { itemId: 'item-1' }],
      ['summarize_item', { itemId: 'item-1' }],
    ])
  })
})
