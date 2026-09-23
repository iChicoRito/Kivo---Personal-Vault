import { notifyVaultChanged } from './events'
import { invoke } from './runtime'

export type CollectionProtection = 'none' | 'password' | 'pin'

export type Collection = {
  id: string
  name: string
  icon: string | null
  protection: CollectionProtection
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
  protection?: CollectionProtection
  secret?: string | null
}): Promise<Collection> {
  const collection = await invoke<Collection>('save_collection', { input })
  notifyVaultChanged()
  return collection
}

export async function verifyCollectionSecret(id: string, secret: string): Promise<boolean> {
  return invoke<boolean>('verify_collection_secret', { id, secret })
}

export async function deleteCollection(id: string): Promise<void> {
  await invoke<void>('delete_collection', { id })
  notifyVaultChanged()
}
