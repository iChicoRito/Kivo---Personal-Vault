// Layout adapted from Monocharts "mono-activity-green" (https://github.com/Subhan-code/Monocharts),
// MIT License, Copyright (c) 2026 Syed Subhan Uddin. Styled with HeroUI tokens and Tooltip.
import { Tooltip } from '@heroui/react'

export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export type Contribution = {
  date: string
  count: number
  level: ContributionLevel
}

// Empty days use the soft surface; busier days step up the theme accent.
const LEVEL_CLASS = ['bg-default', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent']

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function formatDay(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return dayFormat.format(new Date(year, month - 1, day))
}

type MonoActivityHeatmapProps = {
  /** One array per week, seven days per week, oldest first. */
  weeks: Contribution[][]
  label: string
}

export function MonoActivityHeatmap({ weeks, label }: MonoActivityHeatmapProps) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2">
      {/* Square tiles fill the panel width; the grid centres in any spare height. */}
      <div aria-label={label} className="flex w-full gap-1" role="img">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex min-w-0 flex-1 flex-col gap-1">
            {week.map((day) => (
              <Tooltip.Root key={day.date} closeDelay={0} delay={0}>
                {/* The img label summarises the chart, so tiles stay out of the tab order. */}
                <Tooltip.Trigger
                  className={`aspect-square w-full rounded-[4px] transition-transform duration-150 ease-out hover:scale-125 ${LEVEL_CLASS[day.level]}`}
                  tabIndex={-1}
                />
                <Tooltip.Content placement="top">
                  <span className="font-semibold tabular-nums">
                    {day.count} {day.count === 1 ? 'item' : 'items'}
                  </span>{' '}
                  <span className="text-muted">on {formatDay(day.date)}</span>
                </Tooltip.Content>
              </Tooltip.Root>
            ))}
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="flex items-center justify-end gap-1 text-xs text-muted">
        Less
        {LEVEL_CLASS.map((levelClass) => (
          <span key={levelClass} className={`size-2.5 rounded-[3px] ${levelClass}`} />
        ))}
        More
      </div>
    </div>
  )
}
