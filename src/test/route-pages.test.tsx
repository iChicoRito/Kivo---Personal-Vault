import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const itemsMock = vi.hoisted(() => ({
  saveItem: vi.fn(),
  loadItem: vi.fn(),
  listItems: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
  moveItemsToCollection: vi.fn(),
  trashItems: vi.fn(),
  restoreItems: vi.fn(),
  deleteItemsPermanently: vi.fn(),
  importFile: vi.fn(),
  setItemTags: vi.fn(),
}))

const filesMock = vi.hoisted(() => ({
  pickFile: vi.fn(),
  pickFiles: vi.fn(),
  openItemFile: vi.fn(),
  revealItemFile: vi.fn(),
  openSourceUrl: vi.fn(),
}))

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
  saveCollection: vi.fn(),
  deleteCollection: vi.fn(),
}))

const tagsMock = vi.hoisted(() => ({
  listTags: vi.fn(),
  saveTag: vi.fn(),
  deleteTag: vi.fn(),
}))

const activityMock = vi.hoisted(() => ({
  listRecentItems: vi.fn(),
  listActivity: vi.fn(),
  listIndexState: vi.fn(),
  markItemOpened: vi.fn(),
}))

const dashboardMock = vi.hoisted(() => ({
  loadVaultSummary: vi.fn(),
}))

vi.mock('../data/items', () => itemsMock)
vi.mock('../data/files', () => filesMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../data/tags', () => tagsMock)
vi.mock('../data/activity', () => activityMock)
vi.mock('../data/dashboard', () => dashboardMock)

import { AppRoutes } from '../app/router'
import { navigationGroups } from '../app/navigation'
import ModulePage, { moduleRoutes } from '../features/modules/ModulePage'

// Documented dock destinations, independent of the dashboard component.
const dockDestinations = navigationGroups.flatMap((group) => group.links)

const EMPTY_SUMMARY = {
  itemCount: 0,
  noteCount: 0,
  sourceCount: 0,
  fileCount: 0,
  favoriteCount: 0,
  collectionCount: 0,
  tagCount: 0,
  trashCount: 0,
  fileBytes: 0,
  databaseBytes: 0,
}

// Real pages own these routes; each keeps its own title.
const REAL_DESTINATIONS: Array<{ path: string; title: string; description?: string }> = [
  { path: '/items', title: 'All Items' },
  { path: '/notes', title: 'Notes' },
  { path: '/sources', title: 'Source' },
  { path: '/files', title: 'Files' },
  { path: '/collections', title: 'Collections' },
  { path: '/tags', title: 'Tags' },
  { path: '/favorites', title: 'Favorites', description: 'Keep priority items easy to find.' },
  { path: '/recent', title: 'Recent', description: 'Return to items opened lately.' },
  {
    path: '/trash',
    title: 'Trash',
    description: 'Review deleted items before permanent removal.',
  },
]

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  itemsMock.listItems.mockResolvedValue([])
  itemsMock.loadItem.mockResolvedValue(undefined)
  collectionsMock.listCollections.mockResolvedValue([])
  tagsMock.listTags.mockResolvedValue([])
  filesMock.pickFile.mockResolvedValue(null)
  activityMock.listRecentItems.mockResolvedValue({ opened: [], modified: [], created: [] })
  activityMock.markItemOpened.mockResolvedValue(undefined)
  dashboardMock.loadVaultSummary.mockResolvedValue({ ...EMPTY_SUMMARY })
})

describe('documented destinations', () => {
  it.each(REAL_DESTINATIONS)(
    'opens $path with its own title',
    async ({ path, title, description }) => {
      renderRoute(path)

      expect(
        await screen.findByRole('heading', { level: 1, name: title, exact: true }),
      ).toBeInTheDocument()

      if (description) {
        expect(screen.getByText(description)).toBeInTheDocument()
      }
    },
  )

  it('opens Dashboard with its title, empty state, and the navigation dock', async () => {
    renderRoute('/dashboard')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard', exact: true }),
    ).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(
      await within(main).findByRole('heading', {
        level: 2,
        name: 'Your vault is looking a little empty.',
        exact: true,
      }),
    ).toBeInTheDocument()
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

describe('module route metadata', () => {
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
