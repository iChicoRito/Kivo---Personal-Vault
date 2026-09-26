import type { Contribution, ContributionLevel } from '../../components/charts/MonoActivityHeatmap'
import type { ItemSummary } from '../../data/items'

function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Groups items by the local day they were last edited, as weeks of seven days,
 * oldest week first. The last week holds `today`. Days after today count as 0.
 * Levels (0-4) scale to the busiest day.
 */
export function buildActivityWeeks(items: ItemSummary[], today: Date, weekCount = 12) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const date = new Date(item.updatedAt)
    if (Number.isNaN(date.getTime())) continue
    const key = dayKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  // First day shown: the Sunday that starts the oldest week.
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  start.setDate(start.getDate() - start.getDay() - (weekCount - 1) * 7)

  const days = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const key = dayKey(date)
    return { date: key, count: date > today ? 0 : (counts.get(key) ?? 0) }
  })

  const max = Math.max(0, ...days.map((day) => day.count))
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const weeks: Contribution[][] = []
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(
      days.slice(index, index + 7).map((day) => ({
        ...day,
        level: (day.count === 0 ? 0 : Math.ceil((day.count / max) * 4)) as ContributionLevel,
      })),
    )
  }

  return { weeks, total }
}
