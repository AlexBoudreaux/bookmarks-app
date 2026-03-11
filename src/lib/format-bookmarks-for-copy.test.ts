import { describe, it, expect } from 'vitest'
import { formatBookmarksForCopy } from './format-bookmarks-for-copy'

describe('formatBookmarksForCopy', () => {
  it('formats a single tweet', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://x.com/naval/status/123',
        title: 'Naval on Twitter',
        content: 'Seek wealth, not money or status.',
        isTweet: true,
        domain: 'x.com',
        addDate: new Date('2024-03-15'),
        categories: [{ main: 'Wisdom', sub: 'Life' }],
      },
    ])

    expect(result).toContain('Post 1 of 1')
    expect(result).toContain('@naval')
    expect(result).toContain('https://x.com/naval/status/123')
    expect(result).toContain('Seek wealth, not money or status.')
    expect(result).toContain('Wisdom > Life')
  })

  it('formats multiple tweets with separator', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://x.com/user1/status/111',
        title: null,
        content: 'First tweet',
        isTweet: true,
        domain: 'x.com',
        addDate: new Date('2024-01-01'),
        categories: [],
      },
      {
        url: 'https://x.com/user2/status/222',
        title: null,
        content: 'Second tweet',
        isTweet: true,
        domain: 'x.com',
        addDate: new Date('2024-02-01'),
        categories: [],
      },
    ])

    expect(result).toContain('Post 1 of 2')
    expect(result).toContain('Post 2 of 2')
    expect(result).toContain('----')
    expect(result).toContain('First tweet')
    expect(result).toContain('Second tweet')
  })

  it('extracts handle from tweet URL', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://x.com/elonmusk/status/456',
        title: null,
        content: 'Hello',
        isTweet: true,
        domain: 'x.com',
        addDate: null,
        categories: [],
      },
    ])

    expect(result).toContain('@elonmusk')
  })

  it('formats non-tweet bookmarks', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://github.com/some/repo',
        title: 'Amazing Repo',
        content: null,
        isTweet: false,
        domain: 'github.com',
        addDate: new Date('2024-06-01'),
        categories: [{ main: 'Dev', sub: 'Tools' }],
      },
    ])

    expect(result).toContain('Link 1 of 1')
    expect(result).toContain('Amazing Repo')
    expect(result).toContain('https://github.com/some/repo')
    expect(result).toContain('github.com')
  })

  it('includes URLs found in tweet content', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://x.com/dev/status/789',
        title: null,
        content: 'Check out https://github.com/cool/project for more',
        isTweet: true,
        domain: 'x.com',
        addDate: null,
        categories: [],
      },
    ])

    expect(result).toContain('Links: https://github.com/cool/project')
  })

  it('handles null content gracefully', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://x.com/user/status/999',
        title: 'Some tweet',
        content: null,
        isTweet: true,
        domain: 'x.com',
        addDate: null,
        categories: [],
      },
    ])

    expect(result).toContain('Post 1 of 1')
    expect(result).toContain('@user')
    // Should use title as fallback when content is null
    expect(result).toContain('Some tweet')
  })

  it('formats multiple categories', () => {
    const result = formatBookmarksForCopy([
      {
        url: 'https://x.com/user/status/100',
        title: null,
        content: 'Multi-cat tweet',
        isTweet: true,
        domain: 'x.com',
        addDate: null,
        categories: [
          { main: 'Claude Code', sub: 'Plugins' },
          { main: 'Dev Tools', sub: 'CLI' },
        ],
      },
    ])

    expect(result).toContain('Claude Code > Plugins')
    expect(result).toContain('Dev Tools > CLI')
  })
})
