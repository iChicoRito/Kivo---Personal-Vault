import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const settingsMock = vi.hoisted(() => ({
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
}))

vi.mock('../data/settings', () => settingsMock)

import AppShell from '../app/AppShell'
import { DEFAULT_PREFERENCES, PreferencesProvider, usePreferences } from '../app/preferences'
import { setMediaQueryMatches } from './setup'

const PREFERENCES = {
  theme: 'light',
  density: 'compact',
  startAtLogin: false,
}

let lastUpdateError: unknown = null

function TriggerTheme() {
  const { updatePreferences } = usePreferences()

  return (
    <button
      type="button"
      onClick={() => {
        void updatePreferences({ theme: 'dark' }).catch((error) => {
          lastUpdateError = error
        })
      }}
    >
      Go dark
    </button>
  )
}

function renderWithLightTheme(children: ReactNode) {
  return render(
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, theme: 'light' }}>
      {children}
    </PreferencesProvider>,
  )
}

function TriggerDensity() {
  const { updatePreferences } = usePreferences()

  return (
    <button
      type="button"
      onClick={() => {
        void updatePreferences({ density: 'compact' }).catch(() => {})
      }}
    >
      Go compact
    </button>
  )
}

function ThemeProbe() {
  const { preferences, resolvedTheme, systemTheme } = usePreferences()

  return (
    <div>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="system">{systemTheme}</span>
      <span data-testid="theme">{preferences.theme}</span>
      <span data-testid="density">{preferences.density}</span>
    </div>
  )
}

function ShellInsideProvider() {
  return (
    <PreferencesProvider>
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<span>page</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  lastUpdateError = null
  setMediaQueryMatches('(prefers-color-scheme: dark)', false)
  settingsMock.loadPreferences.mockResolvedValue({ ...DEFAULT_PREFERENCES })
  settingsMock.savePreferences.mockResolvedValue(undefined)
})

afterEach(() => {
  const root = document.documentElement
  root.classList.remove('kivo-theme-transition')
  delete root.dataset.theme
  delete root.dataset.density
})

describe('PreferencesProvider', () => {
  it('loads persisted preferences once and applies every root attribute', async () => {
    settingsMock.loadPreferences.mockResolvedValue({ ...PREFERENCES })

    render(
      <PreferencesProvider>
        <ThemeProbe />
      </PreferencesProvider>,
    )

    expect(await screen.findByTestId('theme')).toHaveTextContent('light')
    expect(settingsMock.loadPreferences).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      const root = document.documentElement
      expect(root.dataset.theme).toBe('light')
      expect(root.dataset.density).toBe('compact')
    })
  })

  it('falls back to the safe defaults when loading preferences fails', async () => {
    settingsMock.loadPreferences.mockRejectedValue(new Error('read failed'))

    render(
      <PreferencesProvider>
        <ThemeProbe />
      </PreferencesProvider>,
    )

    expect(await screen.findByTestId('theme')).toHaveTextContent('dark')
    await waitFor(() =>
      expect(document.documentElement.dataset.density).toBe('comfortable'),
    )
  })

  it('resolves the system theme and follows operating system changes', async () => {
    setMediaQueryMatches('(prefers-color-scheme: dark)', true)
    settingsMock.loadPreferences.mockResolvedValue({ ...DEFAULT_PREFERENCES, theme: 'system' })

    render(
      <PreferencesProvider>
        <ThemeProbe />
      </PreferencesProvider>,
    )

    expect(await screen.findByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await act(async () => setMediaQueryMatches('(prefers-color-scheme: dark)', false))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(screen.getByTestId('system')).toHaveTextContent('light')
  })

  it('keeps an explicit theme when the operating system theme changes', async () => {
    settingsMock.loadPreferences.mockResolvedValue({ ...DEFAULT_PREFERENCES, theme: 'light' })

    render(
      <PreferencesProvider>
        <ThemeProbe />
      </PreferencesProvider>,
    )

    expect(await screen.findByTestId('resolved')).toHaveTextContent('light')

    await act(async () => setMediaQueryMatches('(prefers-color-scheme: dark)', true))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('persists a patch through savePreferences and applies it', async () => {
    render(
      <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES }}>
        <TriggerTheme />
      </PreferencesProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go dark' }))

    await waitFor(() =>
      expect(settingsMock.savePreferences).toHaveBeenCalledWith({
        ...DEFAULT_PREFERENCES,
        theme: 'dark',
      }),
    )
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
  })

  it('rolls the applied value back when saving rejects and reports the error', async () => {
    settingsMock.savePreferences.mockRejectedValue(new Error('save failed'))

    render(
      <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES }}>
        <TriggerTheme />
        <ThemeProbe />
      </PreferencesProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go dark' }))

    await waitFor(() => expect(lastUpdateError).toBeInstanceOf(Error))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('writes each root attribute once from the single provider writer', async () => {
    const written: string[] = []
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName) {
          written.push(mutation.attributeName)
        }
      }
    })

    observer.observe(document.documentElement, { attributes: true })

    render(<ShellInsideProvider />)

    await screen.findByText('page')
    await act(async () => {})
    observer.disconnect()

    const writesOf = (name: string) => written.filter((written) => written === name).length

    expect(writesOf('data-theme')).toBe(1)
    expect(writesOf('data-density')).toBe(1)
  })
})

describe('root attribute timing', () => {
  it('applies the resolved theme before any passive effect of the tree runs', () => {
    // Captured from a passive effect: React runs every layout effect during the
    // commit, then flushes passive effects, so this reads the DOM before paint.
    // A passive writer would still be pending here and this would read undefined.
    const seen: Array<string | undefined> = []

    function AttributeProbe() {
      const [observed, setObserved] = useState('pending')

      useEffect(() => {
        const value = document.documentElement.dataset.theme
        seen.push(value)
        setObserved(value ?? 'unset')
      }, [])

      return <span data-testid="observed">{observed}</span>
    }

    render(
      <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, theme: 'dark' }}>
        <AttributeProbe />
      </PreferencesProvider>,
    )

    expect(seen).toEqual(['dark'])
    expect(screen.getByTestId('observed')).toHaveTextContent('dark')
  })
})

describe('theme swap transition', () => {
  const swapClass = 'kivo-theme-transition'

  it('leaves the first application of a theme unmarked', () => {
    renderWithLightTheme(<ThemeProbe />)

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement).not.toHaveClass(swapClass)
  })

  it('marks the document for the length of a resolved theme change', async () => {
    renderWithLightTheme(<TriggerTheme />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go dark' }))
    })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement).toHaveClass(swapClass)

    await waitFor(() => expect(document.documentElement).not.toHaveClass(swapClass))
  })

  it('does not mark a preference change that repaints nothing', async () => {
    renderWithLightTheme(<TriggerDensity />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go compact' }))
    })

    expect(document.documentElement.dataset.density).toBe('compact')
    expect(document.documentElement).not.toHaveClass(swapClass)
  })
})

describe('theme reveal', () => {
  const startViewTransition = vi.fn()

  function stubViewTransitionSupport() {
    // Mirrors the real contract: the update callback runs as part of the
    // transition, and readiness resolves afterwards.
    startViewTransition.mockImplementation((applyTheme: () => void) => {
      applyTheme()

      return { ready: Promise.resolve() } as unknown as ViewTransition
    })

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })

    // The setup's matchMedia fake reports reduce-motion as matching, so the
    // reveal has to be opted in explicitly.
    setMediaQueryMatches('(prefers-reduced-motion: reduce)', false)
  }

  afterEach(() => {
    startViewTransition.mockReset()
    Reflect.deleteProperty(document, 'startViewTransition')

    // Custom properties are not own properties of the style declaration, so
    // they have to be removed rather than deleted.
    const style = document.documentElement.style
    style.removeProperty('--kivo-reveal-x')
    style.removeProperty('--kivo-reveal-y')
    style.removeProperty('--kivo-reveal-radius')
  })

  it('wipes the incoming palette out from the last press', async () => {
    stubViewTransitionSupport()

    renderWithLightTheme(<TriggerTheme />)

    fireEvent.pointerDown(window, { clientX: 300, clientY: 120 })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go dark' }))
    })

    // The theme is applied through the view transition's update callback, so the
    // browser captures the incoming palette rather than the one being replaced.
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.theme).toBe('dark')

    const style = document.documentElement.style

    expect(style.getPropertyValue('--kivo-reveal-x')).toBe('300px')
    expect(style.getPropertyValue('--kivo-reveal-y')).toBe('120px')

    // The circle has to reach past the furthest corner from the press.
    expect(Number.parseFloat(style.getPropertyValue('--kivo-reveal-radius'))).toBeCloseTo(
      Math.hypot(window.innerWidth - 300, window.innerHeight - 120),
    )
  })

  it('skips the wipe when the user prefers reduced motion', async () => {
    stubViewTransitionSupport()
    setMediaQueryMatches('(prefers-reduced-motion: reduce)', true)

    renderWithLightTheme(<TriggerTheme />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go dark' }))
    })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(document.documentElement.style.getPropertyValue('--kivo-reveal-radius')).toBe('')
  })

  it('lets a caller own the swap without starting the wipe', async () => {
    stubViewTransitionSupport()

    function TriggerClaimedTheme() {
      const { updatePreferences } = usePreferences()

      return (
        <button
          type="button"
          onClick={() => {
            void updatePreferences({ theme: 'dark' }, { transition: false }).catch(() => {})
          }}
        >
          Go dark
        </button>
      )
    }

    renderWithLightTheme(<TriggerClaimedTheme />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go dark' }))
    })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(startViewTransition).not.toHaveBeenCalled()
  })
})
