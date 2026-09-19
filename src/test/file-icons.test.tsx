import '@testing-library/jest-dom/vitest'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FileTypeIcon, fileIconSlug } from '../components/items/FileTypeIcon'

describe('fileIconSlug', () => {
  it('detects known extensions regardless of case', () => {
    expect(fileIconSlug('Budget 2026.pdf')).toBe('pdf')
    expect(fileIconSlug('NAV.TS')).toBe('ts')
    expect(fileIconSlug('design.fig')).toBe('fig')
  })

  it('returns null when the format has no icon', () => {
    expect(fileIconSlug('photo.png')).toBeNull()
    expect(fileIconSlug('movie.iso')).toBeNull()
  })

  it('returns null when there is no usable extension', () => {
    expect(fileIconSlug('report')).toBeNull()
    expect(fileIconSlug('.gitignore')).toBeNull()
    expect(fileIconSlug('notes.')).toBeNull()
    expect(fileIconSlug(null)).toBeNull()
    expect(fileIconSlug(undefined)).toBeNull()
  })
})

describe('FileTypeIcon', () => {
  it('renders the matching icon for a known format', () => {
    const view = render(<FileTypeIcon name="Budget 2026.pdf" />)
    const marker = view.container.querySelector('[data-file-icon="pdf"]')

    expect(marker).not.toBeNull()
    expect(marker?.querySelector('svg')).not.toBeNull()
  })

  it('renders the attachment icon when the format has no icon', () => {
    const view = render(<FileTypeIcon name="photo.png" />)
    const marker = view.container.querySelector('[data-file-icon="attachment"]')

    expect(marker).not.toBeNull()
    expect(marker?.querySelector('svg')).not.toBeNull()
  })

  it('falls back when the name is missing', () => {
    const view = render(<FileTypeIcon name={null} />)
    expect(view.container.querySelector('[data-file-icon="attachment"]')).not.toBeNull()
  })
})
