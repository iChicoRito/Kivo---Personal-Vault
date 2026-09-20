import type { ItemSummary } from '../../data/items'

/**
 * One note state per card, so the chips and the color bar always agree.
 * Pinned wins over favorite, and the pair gets its own state to stay visible.
 */
export type NoteStatus = 'pinned' | 'favorite' | 'pinned-favorite' | 'plain'

export function noteStatus(item: Pick<ItemSummary, 'isPinned' | 'isFavorite'>): NoteStatus {
  if (item.isPinned && item.isFavorite) return 'pinned-favorite'
  if (item.isPinned) return 'pinned'
  if (item.isFavorite) return 'favorite'

  return 'plain'
}

export const NOTE_STATUS_CHIP_COLOR: Record<
  NoteStatus,
  'accent' | 'default' | 'success' | 'warning'
> = {
  'pinned-favorite': 'success',
  pinned: 'accent',
  favorite: 'warning',
  plain: 'default',
}

export const NOTE_STATUS_BAR_CLASS: Record<NoteStatus, string> = {
  'pinned-favorite': 'bg-success',
  pinned: 'bg-accent',
  favorite: 'bg-warning',
  plain: 'bg-foreground',
}
