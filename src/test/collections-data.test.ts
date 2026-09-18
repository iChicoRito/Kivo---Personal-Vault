import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import { listCollections, type Collection } from '../data/collections'
import { getTauriInvoke } from './setup'

const COLLECTIONS: Collection[] = [
  {
    id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    name: 'Projects',
    sortOrder: 0,
    createdAt: '2026-09-10T11:20:00.000Z',
  },
  {
    id: 'b2c3d4e5f60718293a4b5c6d7e8f901',
    name: 'Reading',
    sortOrder: 1,
    createdAt: '2026-09-10T11:20:00.000Z',
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
})
