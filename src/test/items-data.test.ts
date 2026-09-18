import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  importFile,
  listItems,
  loadItem,
  saveItem,
  setItemTags,
  type ItemInput,
  type ItemSummary,
  type VaultItem,
} from '../data/items'
import { getTauriInvoke } from './setup'

const NOTE: VaultItem = {
  id: '4f2a9c1b8d3e5f60718293a4b5c6d7e8',
  kind: 'note',
  title: 'Meeting notes',
  description: 'Weekly sync with the design team',
  content: 'Decide the sidebar width and the empty state copy.',
  url: null,
  collectionId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  isFavorite: true,
  createdAt: '2026-09-14T09:30:00.000Z',
  updatedAt: '2026-09-16T14:05:00.000Z',
  tags: ['design', 'planning'],
  file: null,
  fileMissing: false,
}

const FILE_ITEM: VaultItem = {
  id: '9e8d7c6b5a49382716f5e4d3c2b1a090',
  kind: 'file',
  title: 'Budget 2026.pdf',
  description: '',
  content: null,
  url: null,
  collectionId: null,
  isFavorite: false,
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-15T08:00:00.000Z',
  tags: [],
  file: {
    originalName: 'Budget 2026.pdf',
    byteSize: 284_915,
    importedAt: '2026-09-15T08:00:00.000Z',
  },
  fileMissing: false,
}

const SUMMARIES: ItemSummary[] = [
  {
    id: NOTE.id,
    kind: 'note',
    title: 'Meeting notes',
    isFavorite: true,
    collectionId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    updatedAt: '2026-09-16T14:05:00.000Z',
    fileMissing: false,
  },
  {
    id: FILE_ITEM.id,
    kind: 'file',
    title: 'Budget 2026.pdf',
    isFavorite: false,
    collectionId: null,
    updatedAt: '2026-09-15T08:00:00.000Z',
    fileMissing: true,
  },
]

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('items data contract', () => {
  it('passes the full item input through save_item with { input }', async () => {
    const input: ItemInput = {
      id: NOTE.id,
      kind: 'note',
      title: 'Meeting notes',
      description: 'Weekly sync with the design team',
      content: 'Decide the sidebar width and the empty state copy.',
      url: 'https://example.com/notes',
      collectionId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      isFavorite: true,
    }

    getTauriInvoke().mockResolvedValue({ ...NOTE })

    await expect(saveItem(input)).resolves.toEqual(NOTE)
    expect(getTauriInvoke()).toHaveBeenCalledWith('save_item', { input })
    expect(getTauriInvoke()).toHaveBeenCalledWith('save_item', {
      input: {
        id: NOTE.id,
        kind: 'note',
        title: 'Meeting notes',
        description: 'Weekly sync with the design team',
        content: 'Decide the sidebar width and the empty state copy.',
        url: 'https://example.com/notes',
        collectionId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        isFavorite: true,
      },
    })
  })

  it('reads one item with load_item and { id }', async () => {
    getTauriInvoke().mockResolvedValue({ ...NOTE })

    await expect(loadItem(NOTE.id)).resolves.toEqual(NOTE)
    expect(getTauriInvoke()).toHaveBeenCalledWith('load_item', { id: NOTE.id })
  })

  it('reads all items with list_items and no arguments', async () => {
    getTauriInvoke().mockResolvedValue([...SUMMARIES])

    await expect(listItems()).resolves.toEqual(SUMMARIES)
    expect(getTauriInvoke()).toHaveBeenCalledWith('list_items')
  })

  it('imports a file through import_file with { sourcePath }', async () => {
    getTauriInvoke().mockResolvedValue({ ...FILE_ITEM })

    await expect(importFile('C:\\Users\\marka\\Documents\\Budget 2026.pdf')).resolves.toEqual(
      FILE_ITEM,
    )
    expect(getTauriInvoke()).toHaveBeenCalledWith('import_file', {
      sourcePath: 'C:\\Users\\marka\\Documents\\Budget 2026.pdf',
    })
  })

  it('replaces the tags through set_item_tags with { id, tags }', async () => {
    getTauriInvoke().mockResolvedValue(['design', 'planning'])

    await expect(setItemTags(NOTE.id, ['design', 'planning'])).resolves.toEqual([
      'design',
      'planning',
    ])
    expect(getTauriInvoke()).toHaveBeenCalledWith('set_item_tags', {
      id: NOTE.id,
      tags: ['design', 'planning'],
    })
  })
})
