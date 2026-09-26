import type { ItemFilter, ItemSummary } from './items'
import { invoke } from './runtime'

export type RelatedResult = {
  item: ItemSummary
  score: number
  matchedTerms: string[]
}

export async function searchRelatedItems(
  query: string,
  filter?: ItemFilter,
): Promise<RelatedResult[]> {
  return invoke<RelatedResult[]>('search_related_items', {
    input: { query, filter: filter ?? null },
  })
}

export async function reindexItems(): Promise<{ indexed: number; pending: number }> {
  return invoke<{ indexed: number; pending: number }>('reindex_items')
}

export async function suggestTags(itemId: string): Promise<string[]> {
  return invoke<string[]>('suggest_tags', { itemId })
}

export async function summarizeItem(itemId: string): Promise<string[]> {
  return invoke<string[]>('summarize_item', { itemId })
}
