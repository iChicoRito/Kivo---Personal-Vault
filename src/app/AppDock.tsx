import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'

import { Dock, DockIcon } from '../components/ui/dock'
import { navigationGroups } from './navigation'

// The dock is the shell's only navigation; `navigationGroups` is the shared source
// for labels, paths, and icons.
const destinations = navigationGroups.flatMap((group) => group.links)

// Spring rig for the dock's scroll drag, all in pixels: the page pulls the dock
// by DRAG per pixel scrolled (up to MAX_SHIFT), and the spring pulls it home
// with STIFFNESS, bleeds off speed with DAMPING, and lets the pull itself
// fade at TARGET_DECAY so a stopped page lets the dock settle.
const MAX_SHIFT = 26
const DRAG = 0.15
const STIFFNESS = 0.18
const DAMPING = 0.8
const TARGET_DECAY = 0.88

export default function AppDock() {
  const navRef = useRef<HTMLElement>(null)

  // The dock hangs at the bottom like a weighted object: scrolling drags it in
  // the scroll's direction and the spring swings it home once the page
  // settles, so it joins the motion of the page instead of jumping out of the
  // way. The transform is written straight to the node each frame; routing it
  // through state would re-render the nav sixty times a second.
  useEffect(() => {
    const nav = navRef.current
    const scroller = document.getElementById('kivo-main')
    if (!nav || !scroller) return

    let lastY = scroller.scrollTop
    let target = 0
    let offset = 0
    let velocity = 0
    let frame = 0
    let lastTime = 0

    const step = (time: number) => {
      const frames = Math.min(32, time - lastTime) / 16.7
      lastTime = time

      target *= Math.pow(TARGET_DECAY, frames)
      if (Math.abs(target) < 0.05) target = 0

      velocity += (target - offset) * STIFFNESS * frames
      velocity *= Math.pow(DAMPING, frames)
      offset += velocity * frames

      if (target === 0 && Math.abs(offset) < 0.05 && Math.abs(velocity) < 0.05) {
        frame = 0
        nav.style.transform = ''
        return
      }

      nav.style.transform = `translateY(${offset.toFixed(2)}px)`
      frame = requestAnimationFrame(step)
    }

    const onScroll = () => {
      const y = scroller.scrollTop
      const delta = y - lastY
      lastY = y
      if (!delta) return

      target = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, target + delta * DRAG))

      if (!frame) {
        lastTime = performance.now()
        frame = requestAnimationFrame(step)
      }
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    // The dock floats over the bottom of the page area instead of holding a row
    // of its own, so content scrolls behind it like it does behind the navbar.
    // Only the dock catches pointer events; its wrapper stays click-through.
    <nav
      ref={navRef}
      aria-label="Primary navigation"
      id="kivo-dock-nav"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-3"
    >
      {/* The dock is wider than narrow windows, so it scrolls sideways instead of clipping.
          The magnified icon is taller than the dock, so vertical overflow is hidden here
          and scrollbar chrome is suppressed; hover growth must not paint a bar. */}
      <div className="overflow-x-auto overflow-y-hidden py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Dock className="kivo-dock pointer-events-auto">
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
