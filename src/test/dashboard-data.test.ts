import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import { loadVaultSummary, type VaultSummary } from '../data/dashboard'
import { getTauriInvoke } from './setup'

const SUMMARY: VaultSummary = {
  itemCount: 128,
  noteCount: 74,
  sourceCount: 31,
  fileCount: 23,
  favoriteCount: 12,
  collectionCount: 6,
  tagCount: 18,
  trashCount: 3,
  fileBytes: 284_915_200,
  databaseBytes: 4_194_304,
}

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('dashboard data contract', () => {
  it('reads the vault summary with load_vault_summary and no arguments', async () => {
    getTauriInvoke().mockResolvedValue({ ...SUMMARY })

    await expect(loadVaultSummary()).resolves.toEqual(SUMMARY)
    expect(getTauriInvoke()).toHaveBeenCalledWith('load_vault_summary')
  })

  it('returns the full vault summary shape', async () => {
    getTauriInvoke().mockResolvedValue({ ...SUMMARY })

    const summary = await loadVaultSummary()

    expect(Object.keys(summary).sort()).toEqual(
      [
        'collectionCount',
        'databaseBytes',
        'favoriteCount',
        'fileBytes',
        'fileCount',
        'itemCount',
        'noteCount',
        'sourceCount',
        'tagCount',
        'trashCount',
      ].sort(),
    )
  })
})
