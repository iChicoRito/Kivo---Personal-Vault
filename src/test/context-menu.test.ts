import '@testing-library/jest-dom/vitest'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { installContextMenuGuard, keepsNativeContextMenu } from '../lib/contextMenu'

describe('keepsNativeContextMenu', () => {
  it('keeps the native menu inside an input', () => {
    expect(keepsNativeContextMenu(document.createElement('input'))).toBe(true)
  })

  it('keeps the native menu inside a textarea', () => {
    expect(keepsNativeContextMenu(document.createElement('textarea'))).toBe(true)
  })

  it('keeps the native menu inside a contenteditable element', () => {
    const element = document.createElement('div')
    element.setAttribute('contenteditable', 'true')

    expect(keepsNativeContextMenu(element)).toBe(true)
  })

  it('keeps the native menu inside a textbox role', () => {
    const element = document.createElement('div')
    element.setAttribute('role', 'textbox')

    expect(keepsNativeContextMenu(element)).toBe(true)
  })

  it('does not keep the native menu for a plain div', () => {
    expect(keepsNativeContextMenu(document.createElement('div'))).toBe(false)
  })

  it('does not keep the native menu for a button', () => {
    expect(keepsNativeContextMenu(document.createElement('button'))).toBe(false)
  })
})

describe('installContextMenuGuard', () => {
  // The listener sits on `document`, so install it once for the whole file.
  beforeAll(() => {
    installContextMenuGuard()
  })

  const mounted: HTMLElement[] = []

  function mount(element: HTMLElement) {
    document.body.append(element)
    mounted.push(element)
    return element
  }

  afterEach(() => {
    for (const element of mounted) element.remove()
    mounted.length = 0
  })

  it('blocks the context menu on a plain element', () => {
    const element = mount(document.createElement('div'))
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('keeps the context menu on an input', () => {
    const element = mount(document.createElement('input'))
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
