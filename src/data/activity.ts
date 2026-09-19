import { invoke } from './runtime'
import type { ItemSummary } from './items'

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

export type RecentItems = {
  opened: ItemSummary[]
  modified: ItemSummary[]
  created: ItemSummary[]
}

export async function markItemOpened(id: string): Promise<void> {
  return invoke<void>('mark_item_opened', { id })
}

export async function listRecentItems(): Promise<RecentItems> {
  return invoke<RecentItems>('list_recent_items')
}
