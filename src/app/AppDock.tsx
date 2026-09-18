import { HugeiconsIcon } from '@hugeicons/react'
import { NavLink } from 'react-router-dom'

import { Dock, DockIcon } from '../components/ui/dock'
import { navigationGroups } from './navigation'

// The dock is the shell's only navigation; `navigationGroups` is the shared source
// for labels, paths, and icons.
const destinations = navigationGroups.flatMap((group) => group.links)

export default function AppDock() {
  return (
    <nav aria-label="Primary navigation" className="min-w-0 px-4 pb-3">
      {/* The dock is wider than narrow windows, so it scrolls sideways instead of clipping.
          The magnified icon is taller than the dock, so vertical overflow is hidden here
          and scrollbar chrome is suppressed; hover growth must not paint a bar. */}
      <div className="overflow-x-auto overflow-y-hidden py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Dock className="kivo-dock">
          {destinations.map((destination) => (
            <DockIcon key={destination.to} label={destination.label}>
              {/* Hover surface for the dock. The active destination keeps the accent
                  fill and a slightly larger circle at rest, so the selected item stays
                  emphasized after the click; other items show the soft surface on hover.
                  The dock's magnification scales this circle with the cursor. */}
              <div className="grid size-9 place-items-center rounded-full transition-[background-color,scale] duration-300 ease-out hover:bg-(--default) has-[a[aria-current=page]]:scale-110 has-[a[aria-current=page]]:bg-accent">
                <NavLink
                  aria-label={destination.label}
                  className={({ isActive }) =>
                    `flex size-6 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'text-accent-foreground' : 'text-foreground'
                    }`
                  }
                  end
                  to={destination.to}
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={destination.icon}
                    size={20}
                    strokeWidth={1.75}
                  />
                </NavLink>
              </div>
            </DockIcon>
          ))}
        </Dock>
      </div>
    </nav>
  )
}
