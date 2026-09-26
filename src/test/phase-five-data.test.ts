import { beforeEach, expect, it } from 'vitest'
import { readItemFile } from '../data/files'
import { loadStorageReport } from '../data/storage'
import { indexFile, listIndexState } from '../data/indexing'
import { listItemVersions, restoreItemVersion } from '../data/versions'
import { matchesShortcut, shortcuts } from '../app/shortcuts'
import { getTauriInvoke } from './setup'

beforeEach(() => getTauriInvoke().mockReset())

it('uses exact phase five command arguments', async () => {
  getTauriInvoke().mockResolvedValue(null)
  await readItemFile('file')
  await loadStorageReport()
  await listItemVersions('note')
  await restoreItemVersion('version')
  await indexFile('pdf')
  expect(getTauriInvoke().mock.calls).toEqual([
    ['read_item_file', { id: 'file' }],
    ['load_storage_report'],
    ['list_item_versions', { itemId: 'note' }],
    ['restore_item_version', { versionId: 'version' }],
    ['index_file', { itemId: 'pdf' }],
  ])
})

it('reads the index state with list_index_state and no arguments', async () => {
  const state = [
    {
      itemId: '4f2a9c1b8d3e5f60718293a4b5c6d7e8',
      needsIndex: true,
      indexedAt: null,
      status: 'pending' as const,
    },
    {
      itemId: '9e8d7c6b5a49382716f5e4d3c2b1a090',
      needsIndex: false,
      indexedAt: '2026-09-15T08:00:00.000Z',
      status: 'indexed' as const,
    },
  ]
  getTauriInvoke().mockResolvedValue(state)

  await expect(listIndexState()).resolves.toEqual(state)
  expect(getTauriInvoke()).toHaveBeenCalledWith('list_index_state')
})

it('reserves numbered shortcuts for first six modules and accepts Meta', () => {
  expect(shortcuts.filter((entry) => entry.key.match(/^[1-9]$/)).map((entry) => entry.label)).toEqual([
    'Dashboard', 'All Items', 'Notes', 'Sources', 'Files', 'Collections',
  ])
  expect(matchesShortcut({ key: 'K', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }, 'palette')).toBe(true)
  expect(matchesShortcut({ key: 'n', metaKey: false, ctrlKey: true, shiftKey: true, altKey: false }, 'quickAdd')).toBe(true)
  expect(matchesShortcut({ key: 'n', metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }, 'quickAdd')).toBe(false)
  expect(matchesShortcut({ key: 'd', metaKey: false, ctrlKey: true, shiftKey: false, altKey: false }, 'favorite')).toBe(true)
})
