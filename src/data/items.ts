import { notifyVaultChanged } from './events'
import { invoke } from './runtime'

export type ItemKind = 'note' | 'source' | 'file'

export type FileDetails = {
  originalName: string
  byteSize: number
  importedAt: string
}

export type VaultItem = {
  id: string
  kind: ItemKind
  title: string
  description: string
  content: string | null
  url: string | null
  collectionId: string | null
  isFavorite: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
  tags: string[]
  file: FileDetails | null
  fileMissing: boolean
}

export type ItemSummary = Pick<
  VaultItem,
  | 'id'
  | 'kind'
  | 'title'
  | 'isFavorite'
  | 'collectionId'
  | 'updatedAt'
  | 'fileMissing'
  | 'isPinned'
  | 'content'
  | 'file'
> & { deletedAt?: string | null }

export type ItemSort = 'title' | 'created' | 'updated' | 'kind'

export type ItemFilter = {
  kind?: ItemKind
  collectionId?: string
  tagId?: string
  favorite?: boolean
  query?: string
  sort?: ItemSort
  trashed?: boolean
}

export type ItemInput = {
  id?: string
  kind: ItemKind
  title: string
  description?: string
  content?: string
  url?: string
  collectionId?: string | null
  isFavorite?: boolean
  isPinned?: boolean
}

export async function saveItem(input: ItemInput): Promise<VaultItem> {
  const item = await invoke<VaultItem>('save_item', { input })
  notifyVaultChanged()
  return item
}

export async function loadItem(id: string): Promise<VaultItem> {
  return invoke<VaultItem>('load_item', { id })
}

export async function listItems(filter?: ItemFilter): Promise<ItemSummary[]> {
  return invoke<ItemSummary[]>('list_items', { filter: filter ?? null })
}

export async function setItemPinned(id: string, pinned: boolean): Promise<void> {
  return invoke<void>('set_item_pinned', { id, pinned })
}

export async function setItemsFavorite(ids: string[], favorite: boolean): Promise<void> {
  return invoke<void>('set_items_favorite', { ids, favorite })
}

export async function moveItemsToCollection(
  ids: string[],
  collectionId: string | null,
): Promise<void> {
  await invoke<void>('move_items_to_collection', { ids, collectionId })
  notifyVaultChanged()
}

export async function trashItems(ids: string[]): Promise<void> {
  await invoke<void>('trash_items', { ids })
  notifyVaultChanged()
}

export async function restoreItems(ids: string[]): Promise<void> {
  await invoke<void>('restore_items', { ids })
  notifyVaultChanged()
}

export async function deleteItemsPermanently(ids: string[]): Promise<void> {
  await invoke<void>('delete_items_permanently', { ids })
  notifyVaultChanged()
}

export async function importFile(sourcePath: string): Promise<VaultItem> {
  return invoke<VaultItem>('import_file', { sourcePath })
}

export async function setItemTags(id: string, tags: string[]): Promise<string[]> {
  return invoke<string[]>('set_item_tags', { id, tags })
}
