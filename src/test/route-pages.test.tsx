import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '../app/router'
import { navigationGroups } from '../app/navigation'
import ModulePage, { moduleRoutes } from '../features/modules/ModulePage'

// Documented dock destinations, independent of the dashboard component.
const dockDestinations = navigationGroups.flatMap((group) => group.links)

// Documented module destinations, independent of ModulePage metadata.
const MODULE_DESTINATIONS = [
  {
    path: '/items',
    title: 'All Items',
    description: 'Browse saved items from one place.',
    emptyTitle: 'No items yet.',
  },
  {
    path: '/notes',
    title: 'Notes',
    description: 'Keep written notes on this device.',
    emptyTitle: 'No notes yet.',
  },
  {
    path: '/sources',
    title: 'Sources',
    description: 'Keep links and source material together.',
    emptyTitle: 'No sources yet.',
  },
  {
    path: '/files',
    title: 'Files',
    description: 'Keep local files within reach.',
    emptyTitle: 'No files yet.',
  },
  {
    path: '/collections',
    title: 'Collections',
    description: 'Organize items into named collections.',
    emptyTitle: 'No collections yet.',
  },
  {
    path: '/tags',
    title: 'Tags',
    description: 'Use tags to describe saved items.',
    emptyTitle: 'No tags yet.',
  },
  {
    path: '/favorites',
    title: 'Favorites',
    description: 'Keep priority items easy to find.',
    emptyTitle: 'No favorites yet.',
  },
  {
    path: '/recent',
    title: 'Recent',
    description: 'Return to items opened lately.',
    emptyTitle: 'Nothing recent yet.',
  },
  {
    path: '/trash',
    title: 'Trash',
    description: 'Review deleted items before permanent removal.',
    emptyTitle: 'Trash is empty.',
  },
]

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('documented destinations', () => {
  it.each(MODULE_DESTINATIONS)(
    'opens $path with its own title and description',
    async ({ path, title, description }) => {
      renderRoute(path)

      expect(
        await screen.findByRole('heading', { level: 1, name: title, exact: true }),
      ).toBeInTheDocument()
      expect(screen.getByText(description)).toBeInTheDocument()
    },
  )

  it('opens Dashboard with its title and the navigation dock', async () => {
    renderRoute('/dashboard')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard', exact: true }),
    ).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(within(main).queryAllByRole('heading')).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(within(main).queryByRole('status')).not.toBeInTheDocument()
    expect(within(main).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the exact not-found heading for unknown paths', async () => {
    renderRoute('/not-a-kivo-destination')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Not Found', exact: true }),
    ).toBeInTheDocument()
  })
})

describe('module route shells', () => {
  it.each(MODULE_DESTINATIONS)(
    'shows the $path empty state without active unavailable controls',
    async ({ path, emptyTitle }) => {
      renderRoute(path)

      const main = screen.getByRole('main')
      expect(
        await within(main).findByRole('heading', { level: 2, name: emptyTitle, exact: true }),
      ).toBeInTheDocument()
      expect(within(main).getByText('EMPTY STATE')).toBeInTheDocument()
      expect(within(main).queryByRole('button')).not.toBeInTheDocument()
    },
  )

  it('no longer exposes a settings module route', () => {
    expect(moduleRoutes.map((route) => route.path)).not.toContain('settings')
  })

  it('gives every module distinct, specific state copy', () => {
    const fields = [
      'emptyTitle',
      'emptyDescription',
      'loadingTitle',
      'loadingDescription',
      'errorTitle',
      'errorDescription',
    ] as const

    for (const field of fields) {
      const values = moduleRoutes.map((route) => route[field])
      expect(new Set(values).size, field).toBe(moduleRoutes.length)
    }
  })

  it.each(MODULE_DESTINATIONS)(
    'offers a live Dashboard next step on $path',
    async ({ path, emptyTitle }) => {
      renderRoute(path)

      const main = screen.getByRole('main')
      await within(main).findByRole('heading', { level: 2, name: emptyTitle, exact: true })

      const link = within(main).getByRole('link', { name: 'Return to Dashboard' })
      expect(link).toHaveAttribute('href', '/dashboard')
    },
  )
})

describe('ModulePage states', () => {
  const notes = moduleRoutes.find((route) => route.path === 'notes')

  if (!notes) throw new Error('Notes module metadata is missing')

  it('renders loading copy in a live region', () => {
    render(<ModulePage module={notes} state="loading" />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(notes.loadingTitle)
    expect(status).toHaveTextContent(notes.loadingDescription)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders error copy as an alert with a retry action', () => {
    const onRetry = vi.fn()
    render(<ModulePage module={notes} state="error" onRetry={onRetry} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(notes.errorTitle)
    expect(alert).toHaveTextContent(notes.errorDescription)

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders error copy without a retry control when retry is unavailable', () => {
    render(<ModulePage module={notes} state="error" />)

    expect(screen.getByRole('alert')).toHaveTextContent(notes.errorTitle)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Primary dock navigation', () => {
  it('renders one icon link per destination with matching hrefs', async () => {
    renderRoute('/dashboard')

    const dock = await screen.findByRole('navigation', { name: 'Primary navigation' })
    const links = within(dock).getAllByRole('link')

    expect(dockDestinations).toHaveLength(11)
    expect(links).toHaveLength(dockDestinations.length)

    for (const destination of dockDestinations) {
      const link = within(dock).getByRole('link', { name: destination.label, exact: true })
      expect(link).toHaveAttribute('href', destination.to)
      expect(link.querySelector('svg')).not.toBeNull()
    }
  })

  it('renders the dock as the only navigation landmark', async () => {
    renderRoute('/dashboard')

    await screen.findByRole('navigation', { name: 'Primary navigation' })

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
  })

  it('navigates from a dock icon', async () => {
    renderRoute('/dashboard')

    const dock = await screen.findByRole('navigation', { name: 'Primary navigation' })
    fireEvent.click(within(dock).getByRole('link', { name: 'Notes', exact: true }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Notes', exact: true }),
    ).toBeInTheDocument()
  })
})
