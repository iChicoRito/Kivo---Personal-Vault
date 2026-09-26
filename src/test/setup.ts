import '@testing-library/jest-dom/vitest'

import { afterEach, vi } from 'vitest'

const tauriMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

export function getTauriInvoke() {
  return tauriMocks.invoke
}

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriMocks.invoke,
}))

type MediaQueryChangeListener = (event: MediaQueryListEvent) => void

const mediaQueryOverrides = new Map<string, boolean>()
const mediaQueryLists = new Map<string, MediaQueryList>()

function evaluateMediaQuery(query: string) {
  const override = mediaQueryOverrides.get(query)
  if (override !== undefined) return override

  const maxWidth = query.match(/max-width:\s*(\d+)px/)
  const minWidth = query.match(/min-width:\s*(\d+)px/)

  return (
    (maxWidth ? window.innerWidth <= Number(maxWidth[1]) : true) &&
    (minWidth ? window.innerWidth >= Number(minWidth[1]) : true)
  )
}

class MediaQueryListFake {
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null = null

  readonly media: string

  private readonly listeners = new Set<MediaQueryChangeListener>()

  constructor(query: string) {
    this.media = query
  }

  get matches() {
    return evaluateMediaQuery(this.media)
  }

  addEventListener(type: string, listener: MediaQueryChangeListener) {
    if (type === 'change') this.listeners.add(listener)
  }

  removeEventListener(type: string, listener: MediaQueryChangeListener) {
    if (type === 'change') this.listeners.delete(listener)
  }

  addListener(listener: MediaQueryChangeListener) {
    this.listeners.add(listener)
  }

  removeListener(listener: MediaQueryChangeListener) {
    this.listeners.delete(listener)
  }

  notifyChange() {
    const event = { matches: this.matches, media: this.media } as MediaQueryListEvent

    for (const listener of this.listeners) listener(event)
    this.onchange?.call(this as unknown as MediaQueryList, event)
  }
}

function getMediaQueryList(query: string) {
  const existing = mediaQueryLists.get(query)
  if (existing) return existing

  const list = new MediaQueryListFake(query) as unknown as MediaQueryList
  mediaQueryLists.set(query, list)
  return list
}

/** Set the matches value for a media query and fire its change listeners. */
export function setMediaQueryMatches(query: string, matches: boolean) {
  mediaQueryOverrides.set(query, matches)

  const list = mediaQueryLists.get(query) as unknown as MediaQueryListFake | undefined
  list?.notifyChange()
}

// jsdom has no canvas; returning null lets canvas backgrounds skip drawing quietly.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => getMediaQueryList(query),
})

afterEach(() => {
  mediaQueryOverrides.clear()
})

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

/*
 * jsdom ships no Web Animations API, but React Aria's shared element transition
 * (HeroUI's `Tabs.Indicator` uses it) reads `getAnimations()`. An empty list
 * leaves those elements still, which is what the tests want anyway.
 */
Object.defineProperty(Element.prototype, 'getAnimations', {
  configurable: true,
  writable: true,
  value: () => [],
})
