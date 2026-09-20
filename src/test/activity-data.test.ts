import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  listActivity,
  listIndexState,
  listRecentItems,
  markItemOpened,
  type ActivityEntry,
  type IndexState,
  type RecentItems,
} from '../data/activity'
import type { ItemSummary } from '../data/items'
import { getTauriInvoke } from './setup'

const ACTIVITY: ActivityEntry[] = [
  {
    id: 42,
    itemId: '4f2a9c1b8d3e5f60718293a4b5c6d7e8',
    action: 'item_saved',
    createdAt: '2026-09-16T14:05:00.000Z',
  },
  {
    id: 41,
    itemId: '9e8d7c6b5a49382716f5e4d3c2b1a090',
    action: 'file_imported',
    createdAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 40,
    itemId: null,
    action: 'vault_opened',
    createdAt: '2026-09-14T07:45:00.000Z',
  },
]

const INDEX_STATE: IndexState[] = [
  {
    itemId: '4f2a9c1b8d3e5f60718293a4b5c6d7e8',
    needsIndex: true,
    indexedAt: null,
  },
  {
    itemId: '9e8d7c6b5a49382716f5e4d3c2b1a090',
    needsIndex: false,
    indexedAt: '2026-09-15T08:00:00.000Z',
  },
]

const SUMMARY: ItemSummary = {
  id: '4f2a9c1b8d3e5f60718293a4b5c6d7e8',
  kind: 'note',
  title: 'Meeting notes',
  isFavorite: true,
  collectionId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  updatedAt: '2026-09-16T14:05:00.000Z',
  fileMissing: false,
  isPinned: true,
  file: null,
  content: null,
}

const RECENT: RecentItems = {
  opened: [{ ...SUMMARY }],
  modified: [{ ...SUMMARY, id: '9e8d7c6b5a49382716f5e4d3c2b1a090', isFavorite: false }],
  created: [{ ...SUMMARY, id: 'e5f60718293a4b5c6d7e8f9012345678', isPinned: false }],
}

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('activity data contract', () => {
  it('reads the activity log with list_activity and no arguments', async () => {
    getTauriInvoke().mockResolvedValue([...ACTIVITY])

    await expect(listActivity()).resolves.toEqual(ACTIVITY)
    expect(getTauriInvoke()).toHaveBeenCalledWith('list_activity')
  })

  it('reads the index state with list_index_state and no arguments', async () => {
    getTauriInvoke().mockResolvedValue([...INDEX_STATE])

    await expect(listIndexState()).resolves.toEqual(INDEX_STATE)
    expect(getTauriInvoke()).toHaveBeenCalledWith('list_index_state')
  })

  it('marks an item opened with mark_item_opened and { id }', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await expect(markItemOpened('item-id')).resolves.toBeUndefined()
    expect(getTauriInvoke()).toHaveBeenCalledWith('mark_item_opened', { id: 'item-id' })
  })

  it('reads recent items with list_recent_items and no arguments', async () => {
    getTauriInvoke().mockResolvedValue({
      opened: [...RECENT.opened],
      modified: [...RECENT.modified],
      created: [...RECENT.created],
    })

    await expect(listRecentItems()).resolves.toEqual(RECENT)
    expect(getTauriInvoke()).toHaveBeenCalledWith('list_recent_items')
  })
})
