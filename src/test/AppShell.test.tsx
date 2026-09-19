import '@testing-library/jest-dom/vitest'

import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import AppShell from '../app/AppShell'
import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'
import type { Preferences } from '../data/settings'
import { setMediaQueryMatches } from './setup'

const destinationLabels = [
  'Dashboard',
  'Search',
  'All Items',
  'Notes',
  'Sources',
  'Files',
  'Collections',
  'Tags',
  'Favorites',
  'Recent',
  'Trash',
  'Settings',
] as const

const hrefByLabel: Record<string, string> = {
  Dashboard: '/dashboard',
  Search: '/search',
  'All Items': '/items',
  Notes: '/notes',
  Sources: '/sources',
  Files: '/files',
  Collections: '/collections',
  Tags: '/tags',
  Favorites: '/favorites',
  Recent: '/recent',
  Trash: '/trash',
  Settings: '/settings',
}

const deferredControls = ['Quick Add', 'Command Palette', 'Vault Lock']

function RouteMarker() {
  const { pathname } = useLocation()
  return <h1>{pathname}</h1>
}

function renderShell(initialPath = '/dashboard', preferences: Partial<Preferences> = {}) {
  return render(
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, ...preferences }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<RouteMarker />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

function dock() {
  return screen.getByRole('navigation', { name: 'Primary navigation' })
}

async function activateWithEnter(element: HTMLElement) {
  let keyDown: KeyboardEvent | undefined

  await act(async () => {
    element.focus()
    keyDown = createEvent.keyDown(element, { key: 'Enter', code: 'Enter' })
    fireEvent(element, keyDown)

    if (!keyDown.defaultPrevented && element instanceof HTMLAnchorElement) {
      // jsdom does not perform anchor default actions for KeyboardEvent.
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    fireEvent.keyUp(element, { key: 'Enter', code: 'Enter' })
  })

  if (!keyDown) throw new Error('Enter key event was not created')
  return keyDown
}

describe('AppShell', () => {
  it('renders every destination in the dock in documented order', () => {
    renderShell()

    const links = within(dock()).getAllByRole('link')

    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([...destinationLabels])

    for (const label of destinationLabels) {
      expect(within(dock()).getByRole('link', { name: label, exact: true })).toHaveAttribute(
        'href',
        hrefByLabel[label],
      )
    }
  })

  it('keeps the dock mounted on every route', () => {
    renderShell('/notes')

    expect(screen.getByRole('heading', { name: '/notes' })).toBeInTheDocument()
    expect(within(dock()).getAllByRole('link')).toHaveLength(destinationLabels.length)
  })

  it('omits deferred controls from the navigation shell', () => {
    renderShell()

    expect(dock()).toBeInTheDocument()

    for (const label of deferredControls) {
      expect(screen.queryByRole('link', { name: label, exact: true })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: label, exact: true })).not.toBeInTheDocument()
    }
  })

  it('shows the Kivo title and an icon beside every destination', () => {
    renderShell()

    expect(screen.getByText('Kivo')).toBeInTheDocument()

    const links = within(dock()).getAllByRole('link')
    expect(links).toHaveLength(destinationLabels.length)

    for (const link of links) {
      expect(link.querySelector('svg')).not.toBeNull()
    }
  })

  it('renders a label under every dock icon for the hover reveal', () => {
    renderShell()

    const nav = dock()

    for (const label of destinationLabels) {
      expect(within(nav).getByText(label, { exact: true })).toBeInTheDocument()
    }
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles the theme from the navbar control', async () => {
    renderShell()

    const toggler = screen.getByRole('button', { name: 'Toggle theme' })
    expect(toggler.querySelectorAll('svg')).toHaveLength(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(toggler)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBe(toggler)

    fireEvent.click(toggler)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
  })

  it('switches a resolved system theme to an explicit one', async () => {
    act(() => setMediaQueryMatches('(prefers-color-scheme: dark)', true))

    renderShell('/dashboard', { theme: 'system' })

    expect(document.documentElement.dataset.theme).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })

  it('keeps every destination focusable and preserves native Enter activation', async () => {
    renderShell()

    const notesLink = within(dock()).getByRole('link', { name: 'Notes', exact: true })
    const links = within(dock()).getAllByRole('link')

    expect(links.every((link) => link.tabIndex === 0)).toBe(true)
    notesLink.focus()
    expect(document.activeElement).toBe(notesLink)

    const enter = await activateWithEnter(notesLink)
    expect(enter.defaultPrevented).toBe(false)

    await waitFor(() => expect(screen.getByRole('heading', { name: '/notes' })).toBeInTheDocument())
    expect(notesLink).toHaveAttribute('aria-current', 'page')
  })

  it('resolves the system theme from matchMedia and follows change events', async () => {
    act(() => setMediaQueryMatches('(prefers-color-scheme: dark)', true))

    renderShell('/dashboard', { theme: 'system' })

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    await act(async () => {
      setMediaQueryMatches('(prefers-color-scheme: dark)', false)
    })

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'))
  })
})
