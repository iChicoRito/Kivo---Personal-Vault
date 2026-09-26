// Layout adapted from Monocharts "mono-rounded-treemap" (https://github.com/Subhan-code/Monocharts),
// MIT License, Copyright (c) 2026 Syed Subhan Uddin. Styled with HeroUI tokens.

// Biggest tile gets the full accent; smaller ones step down, matching the other charts.
const TILE_CLASS = [
  'bg-accent text-accent-foreground',
  'bg-accent/30 text-foreground',
  'bg-accent/15 text-foreground',
  'bg-default text-foreground',
]

type TreemapTile = { name: string; value: number; display: string }

export function MonoRoundedTreemapChart({ tiles, label }: { tiles: TreemapTile[]; label: string }) {
  const total = tiles.reduce((sum, tile) => sum + tile.value, 0)
  const sorted = [...tiles].sort((a, b) => b.value - a.value)

  return (
    <div aria-label={label} className="flex h-40 gap-1.5" role="img">
      {sorted.map((tile, index) => {
        const share = total > 0 ? tile.value / total : 1 / tiles.length
        return (
          <div
            key={tile.name}
            className={`flex min-w-24 flex-col justify-between rounded-xl p-3 transition-transform duration-150 ease-out hover:scale-[1.01] ${TILE_CLASS[index % TILE_CLASS.length]}`}
            // ponytail: one row sized by share; a real squarified layout if tiles grow past ~4
            style={{ flexGrow: Math.max(share, 0.15), flexBasis: 0 }}
          >
            <span className="text-xs font-semibold">{tile.name}</span>
            <span className="grid gap-0.5">
              <span className="text-lg font-semibold tabular-nums">{tile.display}</span>
              <span className="text-xs tabular-nums opacity-70">{Math.round(share * 100)}%</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
