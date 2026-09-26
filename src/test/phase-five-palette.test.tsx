import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it } from 'vitest'
import { CommandPalette } from '../app/CommandPalette'
import { getTauriInvoke } from './setup'

beforeEach(() => getTauriInvoke().mockReset())

it('searches modules and items and runs highlighted result with Enter', async () => {
  getTauriInvoke().mockResolvedValue([{ id: 'n1', title: 'Meeting note', kind: 'note' }])
  render(<MemoryRouter><CommandPalette open onClose={() => undefined} onQuickAdd={() => undefined} onShortcuts={() => undefined} /></MemoryRouter>)
  const field = screen.getByRole('textbox', { name: 'Command or item' })
  fireEvent.change(field, { target: { value: 'Meeting' } })
  expect(await screen.findByRole('button', { name: /Meeting note/ })).toBeInTheDocument()
  fireEvent.change(field, { target: { value: 'Storage Manager' } })
  await waitFor(() => expect(screen.getByRole('button', { name: /Open Storage Manager/ })).toBeInTheDocument())
})

it('hides item actions until a vault item is selected', async () => {
  getTauriInvoke().mockResolvedValue([])
  render(<MemoryRouter><CommandPalette open onClose={() => undefined} onQuickAdd={() => undefined} onShortcuts={() => undefined} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: 'Toggle Favorite' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Move to Trash' })).not.toBeInTheDocument()
})

it('offers favorite and trash only after selecting an item', async () => {
  getTauriInvoke().mockImplementation(async (command: string) => command === 'list_items' ? [{ id: 'n1', kind: 'note', title: 'Selected note', isFavorite: false }] : command === 'load_item' ? { id: 'n1', kind: 'note', title: 'Selected note', description: '', content: '', tags: [], file: null, fileMissing: false, isFavorite: false, isPinned: false, collectionId: null, createdAt: '2026-09-24', updatedAt: '2026-09-24' } : [])
  render(<MemoryRouter><CommandPalette open onClose={() => undefined} onQuickAdd={() => undefined} onShortcuts={() => undefined} /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Selected note' }))
  expect(await screen.findByRole('button', { name: 'Toggle Favorite', hidden: true })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move to Trash', hidden: true })).toBeInTheDocument()
})

it('keeps indexed body matches when their titles do not contain the query', async () => {
  getTauriInvoke().mockResolvedValue([{ id: 'n2', kind: 'note', title: 'Meeting notes', matchSnippet: 'The budget changed', isFavorite: false }])
  render(<MemoryRouter><CommandPalette open onClose={() => undefined} onQuickAdd={() => undefined} onShortcuts={() => undefined} /></MemoryRouter>)
  fireEvent.change(screen.getByRole('textbox', { name: 'Command or item' }), { target: { value: 'budget' } })

  expect(await screen.findByRole('button', { name: 'Meeting notes' })).toBeInTheDocument()
})
