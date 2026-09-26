import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const insightsMock = vi.hoisted(() => ({
  summarizeItem: vi.fn(),
}))

const itemsMock = vi.hoisted(() => ({
  loadItem: vi.fn(),
  saveItem: vi.fn(),
  setItemTags: vi.fn(),
  setItemPinned: vi.fn(),
  setItemsFavorite: vi.fn(),
}))

const collectionsMock = vi.hoisted(() => ({
  listCollections: vi.fn(),
}))

const feedbackMock = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}))

vi.mock('../data/insights', () => insightsMock)
vi.mock('../data/items', () => itemsMock)
vi.mock('../data/collections', () => collectionsMock)
vi.mock('../lib/feedback', () => feedbackMock)

import type { VaultItem } from '../data/items'
import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'
import { SummaryCard } from '../features/notes/SummaryCard'
import { NoteEditor } from '../features/notes/NoteEditor'

const NOTE: VaultItem = {
  id: 'n1',
  kind: 'note',
  title: 'Alpha',
  description: '',
  content: 'Body text',
  url: null,
  collectionId: null,
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  tags: [],
  file: null,
  fileMissing: false,
}

const writeText = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  insightsMock.summarizeItem.mockResolvedValue(['First sentence.', 'Second sentence.'])
  itemsMock.loadItem.mockResolvedValue({ ...NOTE })
  itemsMock.saveItem.mockResolvedValue({ ...NOTE, id: 'summary-1' })
  collectionsMock.listCollections.mockResolvedValue([])

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
})

function renderSummary() {
  render(<SummaryCard id="n1" title="Alpha" />)
}

function renderEditor(summaries: boolean) {
  render(
    <MemoryRouter initialEntries={['/notes/n1']}>
      <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, summaries }}>
        <Routes>
          <Route path="/notes/:id" element={<NoteEditor />} />
        </Routes>
      </PreferencesProvider>
    </MemoryRouter>,
  )
}

describe('SummaryCard', () => {
  it('shows the on-device note and hides actions until a summary exists', () => {
    renderSummary()

    expect(screen.getByText('Made on this device. Your note is not changed.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Summarize' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save as note' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument()
    expect(insightsMock.summarizeItem).not.toHaveBeenCalled()
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
  })

  it('builds a summary and shows each sentence as its own text', async () => {
    renderSummary()

    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }))

    expect(await screen.findByText('First sentence.')).toBeInTheDocument()
    expect(screen.getByText('Second sentence.')).toBeInTheDocument()
    expect(insightsMock.summarizeItem).toHaveBeenCalledWith('n1')
    expect(screen.getByRole('button', { name: 'Save as note' })).toBeInTheDocument()
  })

  it('copies the summary text and toasts without writing the source', async () => {
    renderSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }))
    await screen.findByText('First sentence.')

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('First sentence.\n\nSecond sentence.'),
    )
    expect(feedbackMock.notifySuccess).toHaveBeenCalledWith('Summary copied')
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
  })

  it('saves as a new note and leaves the source untouched', async () => {
    renderSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }))
    await screen.findByText('First sentence.')

    fireEvent.click(screen.getByRole('button', { name: 'Save as note' }))

    await waitFor(() =>
      expect(itemsMock.saveItem).toHaveBeenCalledWith({
        kind: 'note',
        title: 'Summary — Alpha',
        content: '<p>First sentence.</p><p>Second sentence.</p>',
      }),
    )
    expect(itemsMock.saveItem).toHaveBeenCalledTimes(1)
    expect(itemsMock.saveItem).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }))
    expect(feedbackMock.notifySuccess).toHaveBeenCalledWith('Summary saved as a note')
  })

  it('regenerates the on-screen text without writing the source', async () => {
    insightsMock.summarizeItem
      .mockResolvedValueOnce(['First sentence.'])
      .mockResolvedValueOnce(['Replaced sentence.'])

    renderSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }))
    await screen.findByText('First sentence.')

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(await screen.findByText('Replaced sentence.')).toBeInTheDocument()
    expect(screen.queryByText('First sentence.')).not.toBeInTheDocument()
    expect(insightsMock.summarizeItem).toHaveBeenCalledTimes(2)
    expect(itemsMock.saveItem).not.toHaveBeenCalled()
  })
})

describe('NoteEditor summary gating', () => {
  it('renders no summary card when the switch is off', async () => {
    renderEditor(false)

    await screen.findByRole('textbox', { name: 'Title' })

    expect(screen.queryByRole('button', { name: 'Summarize' })).not.toBeInTheDocument()
    expect(insightsMock.summarizeItem).not.toHaveBeenCalled()
  })

  it('renders the summary card only when the switch is on', async () => {
    renderEditor(true)

    expect(await screen.findByRole('button', { name: 'Summarize' })).toBeInTheDocument()
    expect(insightsMock.summarizeItem).not.toHaveBeenCalled()
  })
})
