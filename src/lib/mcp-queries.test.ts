import { describe, it, expect, vi } from 'vitest'

vi.mock('@/db', () => ({
  db: {},
}))

import { extractUrls } from './mcp-queries'

describe('extractUrls', () => {
  it('returns empty array for null content', () => {
    expect(extractUrls(null)).toEqual([])
  })

  it('extracts URLs from tweet text', () => {
    const content = 'Check out https://github.com/some/repo and https://docs.example.com'
    const urls = extractUrls(content)
    expect(urls).toEqual(['https://github.com/some/repo', 'https://docs.example.com'])
  })

  it('filters out t.co links', () => {
    const content = 'Link https://t.co/abc123 and https://github.com/real'
    const urls = extractUrls(content)
    expect(urls).toEqual(['https://github.com/real'])
  })

  it('returns empty array for content with no URLs', () => {
    expect(extractUrls('just plain text')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(extractUrls('')).toEqual([])
  })

  it('handles URLs with special characters in path', () => {
    const content = 'See https://example.com/path?q=hello&page=2'
    const urls = extractUrls(content)
    expect(urls).toEqual(['https://example.com/path?q=hello&page=2'])
  })

  it('handles multiple t.co links mixed with real URLs', () => {
    const content = 'https://t.co/a https://github.com https://t.co/b https://x.com/user'
    const urls = extractUrls(content)
    expect(urls).toEqual(['https://github.com', 'https://x.com/user'])
  })
})
