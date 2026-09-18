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
  createdAt: string
  updatedAt: string
  tags: string[]
  file: FileDetails | null
  fileMissing: boolean
}

export type ItemSummary = Pick<
  VaultItem,
  'id' | 'kind' | 'title' | 'isFavorite' | 'collectionId' | 'updatedAt' | 'fileMissing'
>

export type ItemInput = {
  id?: string
  kind: 'note' | 'source'
  title: string
  description?: string
  content?: string
  url?: string
  collectionId?: string | null
  isFavorite?: boolean
}

export async function saveItem(input: ItemInput): Promise<VaultItem> {
  return invoke<VaultItem>('save_item', { input })
}

export async function loadItem(id: string): Promise<VaultItem> {
  return invoke<VaultItem>('load_item', { id })
}

export async function listItems(): Promise<ItemSummary[]> {
  return invoke<ItemSummary[]>('list_items')
}

export async function importFile(sourcePath: string): Promise<VaultItem> {
  return invoke<VaultItem>('import_file', { sourcePath })
}

export async function setItemTags(id: string, tags: string[]): Promise<string[]> {
  return invoke<string[]>('set_item_tags', { id, tags })
}
