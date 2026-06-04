import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true })

const HTML_TAG_RE = /<[^>]+>/g

/** Remove HTML tags from user input before save. */
export function sanitizeMarkdownInput(text: string): string {
  if (!text) return ''
  return text.replace(HTML_TAG_RE, '')
}

const TABLE_WRAP_RE = /<table(\s|>)/gi

function wrapMarkdownTables(html: string): string {
  return html.replace(TABLE_WRAP_RE, '<div class="prose-table-wrap"><table$1')
    .replace(/<\/table>/gi, '</table></div>')
}

/** Parse markdown to sanitized HTML for display only. */
export function renderMarkdown(text: string, options?: { wrapTables?: boolean }): string {
  const source = sanitizeMarkdownInput(text ?? '')
  if (!source.trim()) return ''
  try {
    let raw = marked.parse(source, { async: false }) as string
    if (options?.wrapTables) {
      raw = wrapMarkdownTables(raw)
    }
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
  } catch {
    return DOMPurify.sanitize(source)
  }
}

/** Compact markdown rendering for chat messages (scrollable tables). */
export function renderChatMarkdown(text: string): string {
  return renderMarkdown(text, { wrapTables: true })
}

/** @deprecated Use renderMarkdown */
export const renderRichContent = renderMarkdown
