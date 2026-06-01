import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true })

const HTML_TAG_RE = /<[^>]+>/g

/** Remove HTML tags from user input before save. */
export function sanitizeMarkdownInput(text: string): string {
  if (!text) return ''
  return text.replace(HTML_TAG_RE, '')
}

/** Parse markdown to sanitized HTML for display only. */
export function renderMarkdown(text: string): string {
  const source = sanitizeMarkdownInput(text ?? '')
  if (!source.trim()) return ''
  try {
    const raw = marked.parse(source, { async: false }) as string
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
  } catch {
    return DOMPurify.sanitize(source)
  }
}

/** @deprecated Use renderMarkdown */
export const renderRichContent = renderMarkdown
