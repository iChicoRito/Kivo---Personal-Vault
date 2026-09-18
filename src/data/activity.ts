import { invoke } from './runtime'

export type ActivityEntry = {
  id: number
  itemId: string | null
  action: string
  createdAt: string
}

export type IndexState = {
  itemId: string
  needsIndex: boolean
  indexedAt: string | null
}

export async function listActivity(): Promise<ActivityEntry[]> {
  return invoke<ActivityEntry[]>('list_activity')
}

export async function listIndexState(): Promise<IndexState[]> {
  return invoke<IndexState[]>('list_index_state')
}
