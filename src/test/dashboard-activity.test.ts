import { describe, expect, it } from 'vitest'

import type { ItemSummary } from '../data/items'
import { buildActivityWeeks } from '../features/dashboard/activity'

function edited(updatedAt: string) {
  return { updatedAt } as ItemSummary
}

describe('buildActivityWeeks', () => {
  it('counts items per local day and scales levels to the busiest day', () => {
    // Saturday 26 September 2026, so the last week ends on today.
    const today = new Date(2026, 8, 26, 12)
    const { weeks, total } = buildActivityWeeks(
      [
        edited(new Date(2026, 8, 26, 9).toISOString()),
        edited(new Date(2026, 8, 26, 10).toISOString()),
        edited(new Date(2026, 8, 26, 11).toISOString()),
        edited(new Date(2026, 8, 26, 12).toISOString()),
        edited(new Date(2026, 8, 20, 8).toISOString()),
        edited(new Date(2025, 0, 1).toISOString()),
        edited('not a date'),
      ],
      today,
    )

    expect(weeks).toHaveLength(12)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(total).toBe(5)
    expect(weeks[11][6]).toEqual({ date: '2026-09-26', count: 4, level: 4 })
    expect(weeks[11][0]).toEqual({ date: '2026-09-20', count: 1, level: 1 })
    expect(weeks.flat().filter((day) => day.level > 0)).toHaveLength(2)
  })

  it('returns all zero levels for an empty vault', () => {
    const { weeks, total } = buildActivityWeeks([], new Date(2026, 8, 26))
    expect(total).toBe(0)
    expect(weeks.flat().every((day) => day.level === 0)).toBe(true)
  })
})
