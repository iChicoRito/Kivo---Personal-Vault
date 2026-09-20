/**
 * A note's `content` column holds HTML. Notes written before the rich text
 * editor hold plain text instead, so these helpers keep the two shapes apart
 * and lift the older ones into paragraphs the editor can show.
 */

const HTML_TAG_PATTERN = /<[a-z][^>]*>/i

const EMPTY_MARKUP_PATTERN = /<[^>]*>/g

/** True when the stored note already carries editor markup. */
export function isHtmlContent(content: string): boolean {
  return HTML_TAG_PATTERN.test(content)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Editor-ready HTML for a stored note. Plain text becomes one paragraph per line. */
export function toEditorHtml(content: string): string {
  if (!content.trim()) return ''
  if (isHtmlContent(content)) return content

  return content
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
    .join('')
}

/**
 * Stored value for editor content. An editor that holds nothing but empty
 * paragraphs stores nothing, so blank notes do not keep markup around.
 */
export function toStoredContent(html: string): string {
  const text = html
    .replace(EMPTY_MARKUP_PATTERN, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return text ? html : ''
}

/** One plain sentence for list cards: markup out, entities decoded, spacing collapsed. */
export function notePreview(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
