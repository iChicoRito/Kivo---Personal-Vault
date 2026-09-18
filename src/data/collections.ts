import { invoke } from './runtime'

export type Collection = {
  id: string
  name: string
  icon: string | null
  sortOrder: number
  createdAt: string
  itemCount: number
}

export async function listCollections(): Promise<Collection[]> {
  return invoke<Collection[]>('list_collections')
}

export async function saveCollection(input: {
  id?: string
  name: string
  icon?: string | null
}): Promise<Collection> {
  return invoke<Collection>('save_collection', { input })
}

export async function deleteCollection(id: string): Promise<void> {
  return invoke<void>('delete_collection', { id })
}
