/** One readable size for the file rows and cards, shared by Files and Collections. */
export function formatSize(bytes: number | null | undefined) {
  if (typeof bytes !== 'number' || bytes < 0) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }

  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10
  return `${rounded} ${units[unit]}`
}
