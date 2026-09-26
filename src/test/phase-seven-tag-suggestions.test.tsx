import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const insightsMock = vi.hoisted(() => ({
  suggestTags: vi.fn(),
}))

vi.mock('../data/insights', () => insightsMock)

import { TagSuggestions } from '../components/items/TagSuggestions'
import { DEFAULT_PREFERENCES, PreferencesProvider } from '../app/preferences'

function renderSuggestions({
  autoTag = true,
  value = [],
  onChange = vi.fn(),
}: {
  autoTag?: boolean
  value?: string[]
  onChange?: (next: string[]) => void
} = {}) {
  render(
    <PreferencesProvider initialPreferences={{ ...DEFAULT_PREFERENCES, autoTag }}>
      <TagSuggestions itemId="n1" value={value} onChange={onChange} />
    </PreferencesProvider>,
  )

  return onChange
}

beforeEach(() => {
  vi.clearAllMocks()
  insightsMock.suggestTags.mockResolvedValue([])
})

describe('TagSuggestions', () => {
  it('loads and appends a suggestion on Add', async () => {
    insightsMock.suggestTags.mockResolvedValue(['work', 'budget'])
    const onChange = renderSuggestions()

    expect(await screen.findByText('work')).toBeInTheDocument()
    expect(screen.getByText('Suggested on this device')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0])

    expect(onChange).toHaveBeenCalledWith(['work'])
  })
  it('drops a suggestion on dismiss without writing', async () => {
    insightsMock.suggestTags.mockResolvedValue(['work', 'budget'])
    const onChange = renderSuggestions()

    await screen.findByText('work')

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss work suggestion' }))

    expect(screen.queryByText('work')).not.toBeInTheDocument()
    expect(screen.getByText('budget')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('dedupes against the live tags case-insensitively and reuses the spelling', async () => {
    insightsMock.suggestTags.mockResolvedValue(['Work', 'budget'])
    const onChange = renderSuggestions({ value: ['work'] })

    await screen.findByText('budget')

    expect(screen.queryByText('Work')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0])

    expect(onChange).toHaveBeenCalledWith(['work', 'budget'])
  })

  it('renders nothing and never calls the command when the switch is off', async () => {
    renderSuggestions({ autoTag: false })

    await waitFor(() => expect(insightsMock.suggestTags).not.toHaveBeenCalled())
    expect(screen.queryByText('Suggested on this device')).not.toBeInTheDocument()
  })
})
