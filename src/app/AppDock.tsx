import { Tooltip } from '@heroui/react'
import { HugeiconsIcon } from '@hugeicons/react'
import type { CSSProperties } from 'react'
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
          The magnified icon is 1px taller than the dock, so vertical overflow is hidden here
          and scrollbar chrome is suppressed; hover growth must not paint a bar. */}
      <div className="overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Dock>
          {destinations.map((destination, index) => {
            // Each icon names its own anchor; its tooltip asks for that name so the
            // bubble stays centred while magnification moves the icons.
            const tipAnchor = `--kivo-dock-tip-${index}`
            const anchorStyle = { '--kivo-dock-tip': tipAnchor } as CSSProperties

            return (
              <DockIcon key={destination.to}>
                {/* Fixed-size hover surface: the magnified icon outgrows the dock's padding,
                    so the circle that lights up is capped and stays clear of the dock edge. */}
                <div
                  className="kivo-dock-hover grid size-9 place-items-center rounded-full transition-colors hover:bg-(--default)"
                  style={anchorStyle}
                >
                  <Tooltip delay={0}>
                    {/* Presentation-only trigger; the link stays the single tab stop. */}
                    <Tooltip.Trigger role="presentation" tabIndex={-1}>
                      <NavLink
                        aria-label={destination.label}
                        className={({ isActive }) =>
                          `flex size-6 items-center justify-center rounded-full transition-colors ${
                            isActive ? 'text-accent' : 'text-foreground'
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
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="kivo-dock-tip"
                      placement="top"
                      style={anchorStyle}
                    >
                      {destination.label}
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </DockIcon>
            )
          })}
        </Dock>
      </div>
    </nav>
  )
}
