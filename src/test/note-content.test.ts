import { describe, expect, it } from 'vitest'

import { isHtmlContent, notePreview, toEditorHtml, toStoredContent } from '../features/notes/noteContent'

describe('noteContent', () => {
  it('lifts plain text notes into one paragraph per line', () => {
    expect(toEditorHtml('First line\nSecond line')).toBe('<p>First line</p><p>Second line</p>')
  })

  it('escapes markup characters in plain text notes', () => {
    expect(toEditorHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>')
  })

  it('keeps notes that already carry markup', () => {
    expect(toEditorHtml('<p>Hello <strong>there</strong></p>')).toBe(
      '<p>Hello <strong>there</strong></p>',
    )
  })

  it('treats a blank note as no content', () => {
    expect(toEditorHtml('')).toBe('')
    expect(toEditorHtml('   ')).toBe('')
  })

  it('stores an empty document as nothing', () => {
    expect(toStoredContent('<p></p>')).toBe('')
    expect(toStoredContent('<p></p><p>&nbsp;</p>')).toBe('')
    expect(toStoredContent('<p>Note</p>')).toBe('<p>Note</p>')
  })

  it('recognises stored markup', () => {
    expect(isHtmlContent('<p>x</p>')).toBe(true)
    expect(isHtmlContent('plain text')).toBe(false)
  })

  it('flattens note markup into one preview line', () => {
    expect(notePreview('<p>Hello <strong>there</strong></p>')).toBe('Hello there')
  })

  it('decodes the entities the editor writes and collapses whitespace', () => {
    expect(notePreview('<p>Tom &amp; Jerry</p>\n<p>&nbsp;a &lt;b&gt;</p>')).toBe(
      'Tom & Jerry a <b>',
    )
  })

  it('previews plain text notes and blanks as empty strings', () => {
    expect(notePreview('First line\nSecond line')).toBe('First line Second line')
    expect(notePreview('')).toBe('')
    expect(notePreview('<p>&nbsp;</p>')).toBe('')
  })
})
