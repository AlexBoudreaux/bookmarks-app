interface BookmarkForCopy {
  url: string
  title: string | null
  content: string | null
  isTweet: boolean | null
  domain: string | null
  addDate: Date | null
  categories: Array<{ main: string; sub: string | null }>
}

function extractHandle(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\//)
  return match ? `@${match[1]}` : null
}

function extractUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s)>\]]+/g
  return (content.match(urlRegex) || []).filter(u => !u.includes('t.co/'))
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCategories(categories: Array<{ main: string; sub: string | null }>): string {
  if (categories.length === 0) return ''
  return categories
    .map(c => c.sub ? `${c.main} > ${c.sub}` : c.main)
    .join(', ')
}

export function formatBookmarksForCopy(bookmarks: BookmarkForCopy[]): string {
  const total = bookmarks.length
  const isMixed = bookmarks.some(b => b.isTweet) && bookmarks.some(b => !b.isTweet)

  return bookmarks
    .map((b, i) => {
      const lines: string[] = []
      const num = i + 1
      const label = b.isTweet ? 'Post' : 'Link'
      const prefix = isMixed ? `Item ${num} of ${total}` : `${label} ${num} of ${total}`

      // Header line
      if (b.isTweet) {
        const handle = extractHandle(b.url) || b.domain
        const date = formatDate(b.addDate)
        const headerParts = [handle, date].filter(Boolean).join(' · ')
        lines.push(prefix)
        if (headerParts) lines.push(headerParts)
      } else {
        lines.push(prefix)
        if (b.title) lines.push(b.title)
        if (b.domain) lines.push(b.domain)
      }

      // URL
      lines.push(b.url)

      // Content
      const text = b.content || b.title
      if (text) {
        lines.push('')
        lines.push(text)
      }

      // Categories
      const cats = formatCategories(b.categories)
      if (cats) {
        lines.push('')
        lines.push(`Categories: ${cats}`)
      }

      // Extracted URLs from content
      if (b.content) {
        const urls = extractUrls(b.content)
        if (urls.length > 0) {
          lines.push('')
          lines.push(`Links: ${urls.join(', ')}`)
        }
      }

      return lines.join('\n')
    })
    .join('\n\n----\n\n')
}
