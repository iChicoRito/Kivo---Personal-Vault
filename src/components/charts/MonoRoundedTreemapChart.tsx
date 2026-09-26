// Adapted from Monocharts "mono-rounded-treemap" (https://github.com/Subhan-code/Monocharts),
// MIT License, Copyright (c) 2026 Syed Subhan Uddin.

// Tiles share the theme text color and differ by opacity, biggest first.
const TILE_OPACITY = [1, 0.6, 0.35, 0.2]

type TreemapTile = { name: string; value: number; display: string }

export function MonoRoundedTreemapChart({ tiles, label }: { tiles: TreemapTile[]; label: string }) {
  const total = tiles.reduce((sum, tile) => sum + tile.value, 0)
  const sorted = [...tiles].sort((a, b) => b.value - a.value)

  return (
    <div
      aria-label={label}
      className="flex h-40 gap-1.5 rounded-[14px] bg-default p-2"
      role="img"
    >
      {sorted.map((tile, index) => {
        const share = total > 0 ? tile.value / total : 1 / tiles.length
        const opacity = TILE_OPACITY[index % TILE_OPACITY.length]
        return (
          <div
            key={tile.name}
            className="relative flex min-w-20 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-border p-2 transition-transform hover:scale-[1.02]"
            // ponytail: one row sized by share; a real squarified layout if tiles grow past ~4
            style={{ flexGrow: Math.max(share, 0.15), flexBasis: 0 }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-foreground"
              style={{ opacity }}
            />
            <span
              className={`relative text-[11px] font-bold tracking-tight ${opacity > 0.5 ? 'text-background' : 'text-foreground'}`}
            >
              {tile.name}
            </span>
            <span
              className={`relative font-mono text-[10px] ${opacity > 0.5 ? 'text-background' : 'text-foreground'}`}
            >
              {tile.display} · {Math.round(share * 100)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
