import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ListScrollArea } from '../components/items/ListScrollArea'

function renderFrame() {
  const content = document.createElement('div')
  content.id = 'kivo-content'
  document.body.appendChild(content)
  return content
}

afterEach(() => {
  document.getElementById('kivo-content')?.remove()
})

describe('ListScrollArea', () => {
  it('caps the list inside a scroll shadow when enabled', () => {
    renderFrame()

    const { container } = render(
      <ListScrollArea>
        <ul>
          <li>Row</li>
        </ul>
      </ListScrollArea>,
    )

    const scroller = container.querySelector<HTMLElement>('[data-slot="scroll-shadow"]')

    expect(scroller).not.toBeNull()
    expect(scroller).toContainElement(screen.getByRole('list'))
    expect(scroller).toHaveClass('scroll-shadow--hide-scrollbar')
    // jsdom reports a 768px window, a zero top, and no frame padding.
    expect(scroller?.style.maxHeight).toBe('768px')
  })

  it('leaves room for the content that sits below the list', () => {
    const content = renderFrame()
    content.getBoundingClientRect = () => ({ bottom: 100 }) as DOMRect

    const { container } = render(
      <ListScrollArea>
        <ul>
          <li>Row</li>
        </ul>
      </ListScrollArea>,
    )

    // A 768px window minus 100px of pagination and frame padding below the list.
    const scroller = container.querySelector<HTMLElement>('[data-slot="scroll-shadow"]')
    expect(scroller?.style.maxHeight).toBe('668px')
  })

  it('renders the children unchanged when disabled', () => {
    const { container } = render(
      <ListScrollArea isEnabled={false}>
        <ul>
          <li>Row</li>
        </ul>
      </ListScrollArea>,
    )

    expect(container.querySelector('[data-slot="scroll-shadow"]')).toBeNull()
    expect(screen.getByRole('list')).toBeInTheDocument()
  })
})
