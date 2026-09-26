export const shortcuts = [
  { id: 'search', label: 'Search', key: 'f', shift: false },
  { id: 'palette', label: 'Command palette', key: 'k', shift: false },
  { id: 'newNote', label: 'New Note', key: 'n', shift: false },
  { id: 'quickAdd', label: 'Quick Add', key: 'n', shift: true },
  { id: 'favorite', label: 'Toggle Favorite', key: 'd', shift: false },
  { id: 'dashboard', label: 'Dashboard', key: '1', shift: false },
  { id: 'items', label: 'All Items', key: '2', shift: false },
  { id: 'notes', label: 'Notes', key: '3', shift: false },
  { id: 'sources', label: 'Sources', key: '4', shift: false },
  { id: 'files', label: 'Files', key: '5', shift: false },
  { id: 'collections', label: 'Collections', key: '6', shift: false },
] as const

export type ShortcutId = (typeof shortcuts)[number]['id']

export function matchesShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  id: ShortcutId,
): boolean {
  const binding = shortcuts.find((entry) => entry.id === id)
  return Boolean(binding && (event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey === binding.shift && event.key.toLowerCase() === binding.key)
}
