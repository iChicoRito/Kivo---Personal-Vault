import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { Link, RouterProvider, Tooltip } from '@heroui/react'
import { matchPath, useHref, useLocation, useNavigate } from 'react-router-dom'

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

// Shared with the sidebar so both navigation styles move with the page the same way.
export function useScrollDrag(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const nav = ref.current
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
}

export default function AppDock() {
  const navRef = useRef<HTMLElement>(null)
  useScrollDrag(navRef)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    // The dock floats over the bottom of the page area instead of holding a row
    // of its own, so content scrolls behind it like it does behind the navbar.
    // Only the dock catches pointer events; its wrapper stays click-through.
    <RouterProvider navigate={navigate} useHref={useHref}>
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
          <Dock className="kivo-dock pointer-events-auto" iconMagnification={76}>
            {destinations.map((destination, index) => {
              const isActive = matchPath({ path: destination.to, end: true }, pathname) !== null
              return (
                <DockIcon key={destination.to}>
                  {/* The link is the whole 36px circle, so the hover target and the
                      tooltip trigger cover the full icon, not just the glyph. The
                      active destination keeps the accent fill and a slightly larger
                      circle; others show the soft surface on hover. */}
                  <Tooltip.Root closeDelay={0} delay={0}>
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={destination.label}
                      className={`grid size-9 place-items-center rounded-full no-underline transition-[background-color,scale] duration-300 ease-out hover:no-underline ${
                        isActive
                          ? 'scale-110 bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-(--default)'
                      }`}
                      href={destination.to}
                      style={{ anchorName: `--kivo-dock-${index}` } as CSSProperties}
                    >
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={destination.icon}
                        size={20}
                        strokeWidth={1.75}
                      />
                    </Link>
                    <Tooltip.Content
                      className="kivo-dock-tip"
                      offset={14}
                      placement="top"
                      style={{ positionAnchor: `--kivo-dock-${index}` } as CSSProperties}
                    >
                      {destination.label}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </DockIcon>
              )
            })}
          </Dock>
        </div>
      </nav>
    </RouterProvider>
  )
}
