import { useState } from 'react'

/** Selection mode for a list: off until a row's "Select" menu entry turns it on. */
export function useSelection() {
  const [ids, setIds] = useState<Set<string> | null>(null)

  return {
    isActive: ids !== null,
    isSelected: (id: string) => ids?.has(id) ?? false,
    /** Starts selection with this row, or toggles it when selection is already on. */
    pick: (id: string) =>
      setIds((current) => {
        const next = new Set(current ?? [])
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    setAll: (all: string[]) => setIds(new Set(all)),
    /** Selected ids that are still in `visible`, so removed rows never ride along. */
    selectedIn: (visible: string[]) => visible.filter((id) => ids?.has(id)),
    clear: () => setIds(null),
  }
}

export type Selection = ReturnType<typeof useSelection>
