import { openItemFile, openSourceUrl } from '../../data/files'
import type { ItemSummary } from '../../data/items'

/**
 * Opens an item the way its kind expects: a note goes to the editor route, a
 * source opens its link, and a file opens in the system app. The caller owns the
 * route for notes and the error copy for all three.
 */
export async function openItemByKind(
  item: ItemSummary,
  openNote: (id: string) => void,
): Promise<void> {
  if (item.kind === 'note') {
    openNote(item.id)
    return
  }

  if (item.kind === 'source') {
    await openSourceUrl(item.id)
    return
  }

  await openItemFile(item.id)
}
