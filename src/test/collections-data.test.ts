import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  deleteCollection,
  listCollections,
  saveCollection,
  type Collection,
} from '../data/collections'
import { getTauriInvoke } from './setup'

const COLLECTIONS: Collection[] = [
  {
    id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    name: 'Projects',
    icon: 'folder',
    protection: 'none',
    sortOrder: 0,
    createdAt: '2026-09-10T11:20:00.000Z',
    itemCount: 3,
  },
  {
    id: 'b2c3d4e5f60718293a4b5c6d7e8f901',
    name: 'Reading',
    icon: null,
    protection: 'none',
    sortOrder: 1,
    createdAt: '2026-09-10T11:20:00.000Z',
    itemCount: 0,
  },
]

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('collections data contract', () => {
  it('reads collections with list_collections and no arguments', async () => {
    getTauriInvoke().mockResolvedValue([...COLLECTIONS])

    await expect(listCollections()).resolves.toEqual(COLLECTIONS)
    expect(getTauriInvoke()).toHaveBeenCalledWith('list_collections')
  })

  it('creates a collection through save_collection with { input }', async () => {
    const input = { name: 'Archive', icon: 'box' }
    const created: Collection = {
      id: 'c3d4e5f60718293a4b5c6d7e8f90123',
      name: 'Archive',
      icon: 'box',
      protection: 'none',
      sortOrder: 2,
      createdAt: '2026-09-17T10:00:00.000Z',
      itemCount: 0,
    }

    getTauriInvoke().mockResolvedValue(created)

    await expect(saveCollection(input)).resolves.toEqual(created)
    expect(getTauriInvoke()).toHaveBeenCalledWith('save_collection', { input })
  })

  it('renames a collection through save_collection with the id', async () => {
    const input = { id: COLLECTIONS[0].id, name: 'Projects 2026' }
    const renamed: Collection = { ...COLLECTIONS[0], name: 'Projects 2026' }

    getTauriInvoke().mockResolvedValue(renamed)

    await expect(saveCollection(input)).resolves.toEqual(renamed)
    expect(getTauriInvoke()).toHaveBeenCalledWith('save_collection', { input })
  })

  it('deletes a collection with delete_collection and { id }', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await expect(deleteCollection(COLLECTIONS[0].id)).resolves.toBeUndefined()
    expect(getTauriInvoke()).toHaveBeenCalledWith('delete_collection', {
      id: COLLECTIONS[0].id,
    })
  })
})
