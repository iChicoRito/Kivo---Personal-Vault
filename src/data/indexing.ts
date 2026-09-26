import { invoke } from './runtime'

export type IndexState = {
  itemId: string
  needsIndex: boolean
  indexedAt: string | null
  status: 'pending' | 'indexed' | 'no_text' | 'failed'
}

export async function indexFile(itemId: string): Promise<IndexState> {
  return invoke<IndexState>('index_file', { itemId })
}

export async function listIndexState(): Promise<IndexState[]> {
  return invoke<IndexState[]>('list_index_state')
}
