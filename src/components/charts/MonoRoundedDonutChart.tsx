// Plain SVG donut styled with HeroUI tokens. Segments step down the theme accent.
import { useState } from 'react'

type DonutSegment = { name: string; value: number }

const STROKE_CLASS = ['text-accent', 'text-accent/60', 'text-accent/30', 'text-accent/15']
const DOT_CLASS = ['bg-accent', 'bg-accent/60', 'bg-accent/30', 'bg-accent/15']

const RADIUS = 40
const STROKE = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Room for the round caps plus a small visible gap between segments.
const GAP = STROKE + 3

export function MonoRoundedDonutChart({ data, label }: { data: DonutSegment[]; label: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const total = data.reduce((sum, segment) => sum + segment.value, 0)
  const percent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0)
  const visible = data.filter((segment) => segment.value > 0).length

  let offset = 0
  const segments = data.map((segment, index) => {
    const length = total > 0 ? (segment.value / total) * CIRCUMFERENCE : 0
    const start = offset
    offset += length
    return { ...segment, index, start, length }
  })

  return (
    <div className="flex flex-1 flex-col justify-between gap-3">
      <div aria-label={label} className="relative mx-auto size-40" role="img">
        <svg className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle
            className="text-default"
            cx="50"
            cy="50"
            fill="none"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth={STROKE}
          />
          {segments
            .filter((segment) => segment.length > 0)
            .map((segment) => (
              <circle
                key={segment.name}
                className={`cursor-pointer transition-[opacity,stroke-width] duration-200 ease-out ${STROKE_CLASS[segment.index % STROKE_CLASS.length]} ${
                  hoverIndex !== null && hoverIndex !== segment.index ? 'opacity-40' : ''
                }`}
                cx="50"
                cy="50"
                fill="none"
                r={RADIUS}
                stroke="currentColor"
                strokeDasharray={`${visible > 1 ? Math.max(segment.length - GAP, 0.01) : CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={-(segment.start + (visible > 1 ? GAP / 2 : 0))}
                strokeLinecap={visible > 1 ? 'round' : 'butt'}
                strokeWidth={hoverIndex === segment.index ? STROKE + 2 : STROKE}
                onMouseEnter={() => setHoverIndex(segment.index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">
            {hoverIndex !== null ? `${percent(data[hoverIndex].value)}%` : total}
          </span>
          <span className="text-xs text-muted">
            {hoverIndex !== null ? data[hoverIndex].name : 'items'}
          </span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap items-center justify-around gap-2 p-0 text-xs">
        {data.map((segment, index) => (
          <li
            key={segment.name}
            className="flex cursor-default items-center gap-1.5"
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${DOT_CLASS[index % DOT_CLASS.length]}`}
            />
            <span className="text-muted">{segment.name}</span>
            <span className="tabular-nums">
              {segment.value} · {percent(segment.value)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
