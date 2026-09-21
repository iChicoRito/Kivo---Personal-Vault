import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { ScrollShadow } from '@heroui/react'

import { cn } from '../../lib/utils'

// List mode scrolls inside the list box instead of the page: the box stops
// above whatever else the page stacks under it (the table pagination) and the
// frame's dock clearance, so the page is left with nothing to scroll. HeroUI's
// ScrollShadow owns the overflow and fades the cut edges:
// https://heroui.com/en/docs/react/components/scroll-shadow
const MIN_LIST_HEIGHT = 160

type ListScrollAreaProps = {
  children: ReactNode
  className?: string
  isEnabled?: boolean
}

export function ListScrollArea({ children, className, isEnabled = true }: ListScrollAreaProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!isEnabled) return

    const measure = () => {
      const list = listRef.current
      const content = document.getElementById('kivo-content')
      if (!list || !content) return

      // Adding the page's current scroll back gives the top the box would have
      // at scroll zero, so switching into list mode mid-scroll stays correct.
      const main = document.getElementById('kivo-main')
      const listRect = list.getBoundingClientRect()
      const top = listRect.top + (main?.scrollTop ?? 0)

      // Whatever sits below the box (pagination, the dock clearance) keeps its
      // room, so capping the box leaves the page height on the window.
      const bottomSpace = content.getBoundingClientRect().bottom - listRect.bottom

      // Flooring keeps the page a hair shorter than the window, never taller.
      setMaxHeight(Math.max(MIN_LIST_HEIGHT, Math.floor(window.innerHeight - top - bottomSpace)))
    }

    measure()
    window.addEventListener('resize', measure)

    const observer = new ResizeObserver(measure)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [isEnabled])

  if (!isEnabled) return <>{children}</>

  // The cards grow on hover (hover:scale-[1.02]), so the scrollport keeps a
  // slice of padding for the grown card to paint in: inline padding sized to
  // the frame's own, plus a pixel of vertical room. The matching negative
  // margins hold the list in its column, so the frame geometry is unchanged.
  return (
    <ScrollShadow
      ref={listRef}
      className={cn(
        '-mx-[clamp(0.75rem,2.5vw,2.5rem)] -my-1 px-[clamp(0.75rem,2.5vw,2.5rem)] py-1 overscroll-contain',
        className,
      )}
      hideScrollBar
      style={maxHeight === null ? undefined : { maxHeight }}
    >
      {children}
    </ScrollShadow>
  )
}
