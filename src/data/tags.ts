import { invoke } from './runtime'

export type Tag = {
  name: string
  count: number
}

export async function listTags(): Promise<Tag[]> {
  return invoke<Tag[]>('list_tags')
}
