import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import { openItemFile, openSourceUrl, pickFile, revealItemFile } from '../data/files'
import { getTauriInvoke } from './setup'

const ITEM_ID = '9e8d7c6b5a49382716f5e4d3c2b1a090'

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('files data contract', () => {
  it('picks a file with pick_file and no arguments', async () => {
    getTauriInvoke().mockResolvedValue('C:\\Users\\marka\\Documents\\Budget 2026.pdf')

    await expect(pickFile()).resolves.toBe('C:\\Users\\marka\\Documents\\Budget 2026.pdf')
    expect(getTauriInvoke()).toHaveBeenCalledWith('pick_file')
  })

  it('returns null when the picker is cancelled', async () => {
    getTauriInvoke().mockResolvedValue(null)

    await expect(pickFile()).resolves.toBeNull()
    expect(getTauriInvoke()).toHaveBeenCalledWith('pick_file')
  })

  it('opens a managed file with open_item_file and { id }', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await expect(openItemFile(ITEM_ID)).resolves.toBeUndefined()
    expect(getTauriInvoke()).toHaveBeenCalledWith('open_item_file', { id: ITEM_ID })
  })

  it('reveals a managed file with reveal_item_file and { id }', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await expect(revealItemFile(ITEM_ID)).resolves.toBeUndefined()
    expect(getTauriInvoke()).toHaveBeenCalledWith('reveal_item_file', { id: ITEM_ID })
  })

  it('opens a source address with open_source_url and { id }', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await expect(openSourceUrl(ITEM_ID)).resolves.toBeUndefined()
    expect(getTauriInvoke()).toHaveBeenCalledWith('open_source_url', { id: ITEM_ID })
  })
})
