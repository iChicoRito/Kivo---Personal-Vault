import { invoke } from './runtime'

export type Tag = {
  id: string
  name: string
  count: number
}

export async function listTags(): Promise<Tag[]> {
  return invoke<Tag[]>('list_tags')
}

export async function saveTag(input: { id?: string; name: string }): Promise<Tag> {
  return invoke<Tag>('save_tag', { input })
}

export async function deleteTag(id: string): Promise<void> {
  return invoke<void>('delete_tag', { id })
}
