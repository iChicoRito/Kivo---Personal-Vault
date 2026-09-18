import '@testing-library/jest-dom/vitest'

import { beforeEach, describe, expect, it } from 'vitest'

import { deleteTag, listTags, saveTag, type Tag } from '../data/tags'
import { getTauriInvoke } from './setup'

const TAGS: Tag[] = [
  { id: 'd4e5f60718293a4b5c6d7e8f90123456', name: 'design', count: 4 },
  { id: 'e5f60718293a4b5c6d7e8f9012345678', name: 'planning', count: 1 },
]

beforeEach(() => {
  getTauriInvoke().mockReset()
})

describe('tags data contract', () => {
  it('reads tags with list_tags and no arguments', async () => {
    getTauriInvoke().mockResolvedValue([...TAGS])

    await expect(listTags()).resolves.toEqual(TAGS)
    expect(getTauriInvoke()).toHaveBeenCalledWith('list_tags')
  })

  it('creates a tag through save_tag with { input }', async () => {
    const input = { name: 'research' }
    const created: Tag = {
      id: 'f60718293a4b5c6d7e8f901234567890',
      name: 'research',
      count: 0,
    }

    getTauriInvoke().mockResolvedValue(created)

    await expect(saveTag(input)).resolves.toEqual(created)
    expect(getTauriInvoke()).toHaveBeenCalledWith('save_tag', { input })
  })

  it('renames a tag through save_tag with the id', async () => {
    const input = { id: TAGS[0].id, name: 'visual design' }
    const renamed: Tag = { ...TAGS[0], name: 'visual design' }

    getTauriInvoke().mockResolvedValue(renamed)

    await expect(saveTag(input)).resolves.toEqual(renamed)
    expect(getTauriInvoke()).toHaveBeenCalledWith('save_tag', { input })
  })

  it('deletes a tag with delete_tag and { id }', async () => {
    getTauriInvoke().mockResolvedValue(undefined)

    await expect(deleteTag(TAGS[1].id)).resolves.toBeUndefined()
    expect(getTauriInvoke()).toHaveBeenCalledWith('delete_tag', { id: TAGS[1].id })
  })
})
