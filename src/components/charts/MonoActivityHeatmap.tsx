// Adapted from Monocharts "mono-activity-green" (https://github.com/Subhan-code/Monocharts),
// MIT License, Copyright (c) 2026 Syed Subhan Uddin.
import { useState } from 'react'

export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export type Contribution = {
  date: string
  count: number
  level: ContributionLevel
}

const GREEN = '#39d353'
const LEVEL_OPACITY = [0.08, 0.3, 0.55, 0.8, 1]

type MonoActivityHeatmapProps = {
  /** One array per week, seven days per week, oldest first. */
  weeks: Contribution[][]
  label: string
}

export function MonoActivityHeatmap({ weeks, label }: MonoActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<Contribution | null>(null)

  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] bg-default p-3">
      <div
        aria-label={label}
        className="flex w-full justify-center gap-1"
        role="img"
        onMouseLeave={() => setHoveredDay(null)}
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex max-w-5 flex-1 flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className="aspect-square w-full cursor-pointer rounded-[3px] transition-transform hover:scale-125"
                style={{ backgroundColor: GREEN, opacity: LEVEL_OPACITY[day.level] }}
                onMouseEnter={() => setHoveredDay(day)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-2 flex h-5 items-center justify-center font-mono text-[10px] text-muted">
        {hoveredDay
          ? `${hoveredDay.count} ${hoveredDay.count === 1 ? 'item' : 'items'} on ${hoveredDay.date}`
          : 'Hover tiles for details'}
      </div>
    </div>
  )
}
