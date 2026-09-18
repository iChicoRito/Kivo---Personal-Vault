import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '../app/router'

const destinations: Array<[path: string, heading: string]> = [
  ['/dashboard', 'Dashboard'],
  ['/items', 'All Items'],
  ['/notes', 'Notes'],
  ['/sources', 'Sources'],
  ['/files', 'Files'],
  ['/collections', 'Collections'],
  ['/tags', 'Tags'],
  ['/favorites', 'Favorites'],
  ['/recent', 'Recent'],
  ['/trash', 'Trash'],
  ['/settings', 'Settings'],
]

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('router', () => {
  it('lands on Dashboard for the root path', async () => {
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard', exact: true })).toBeInTheDocument()
  })

  it.each(destinations)('opens %s as its own route', async (path, heading) => {
    renderAt(path)

    expect(await screen.findByRole('heading', { name: heading, exact: true })).toBeInTheDocument()
  })

  it('renders the exact not-found heading for unknown paths', async () => {
    renderAt('/not-a-kivo-destination')

    expect(await screen.findByRole('heading', { name: 'Not Found', exact: true })).toBeInTheDocument()
  })
})
