// Adapted from Monocharts "mono-rounded-donut" (https://github.com/Subhan-code/Monocharts),
// MIT License, Copyright (c) 2026 Syed Subhan Uddin.
import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts'

// Segments share the theme text color and differ by opacity.
const SEGMENT_OPACITY = [1, 0.7, 0.4, 0.2]

type DonutSegment = { name: string; value: number }

function DonutTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="pointer-events-none rounded-xl border border-border bg-overlay px-3 py-2 text-xs shadow-lg">
      <span className="text-muted">{item.name}: </span>
      <span className="font-semibold tabular-nums">{item.value}</span>
    </div>
  )
}

export function MonoRoundedDonutChart({ data, label }: { data: DonutSegment[]; label: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const total = data.reduce((sum, segment) => sum + segment.value, 0)
  const percent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-label={label}
        className="relative flex items-center justify-center rounded-[14px] bg-default p-2 text-foreground"
        role="img"
      >
        <ResponsiveContainer height={160} width="100%">
          <PieChart>
            <Tooltip content={<DonutTooltip />} />
            <Pie
              animationDuration={900}
              cornerRadius={8}
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius={46}
              nameKey="name"
              outerRadius={68}
              paddingAngle={6}
              stroke="none"
              onMouseEnter={(_, index) => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {data.map((segment, index) => (
                <Cell
                  key={segment.name}
                  fill="currentColor"
                  fillOpacity={SEGMENT_OPACITY[index % SEGMENT_OPACITY.length]}
                  style={{
                    cursor: 'pointer',
                    transform: hoverIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold tabular-nums">
            {hoverIndex !== null ? `${percent(data[hoverIndex].value)}%` : total}
          </span>
          <span className="text-[10px] text-muted">
            {hoverIndex !== null ? data[hoverIndex].name : 'items'}
          </span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap items-center justify-around gap-2 p-0 text-xs">
        {data.map((segment, index) => (
          <li key={segment.name} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-foreground"
              style={{ opacity: SEGMENT_OPACITY[index % SEGMENT_OPACITY.length] }}
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
