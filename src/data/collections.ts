import { invoke } from './runtime'

export type Collection = {
  id: string
  name: string
  sortOrder: number
  createdAt: string
}

export async function listCollections(): Promise<Collection[]> {
  return invoke<Collection[]>('list_collections')
}
