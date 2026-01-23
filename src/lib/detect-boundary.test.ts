import { describe, it, expect } from 'vitest'
import { detectBoundary } from './detect-boundary'
import type { Bookmark } from './parse-bookmarks'

describe('detectBoundary', () => {
  it('should find boundary when Tools folder and matching URL exist', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://example.com/1',
        title: 'Bookmark 1',
        addDate: null,
        folderPath: 'Bookmarks Bar/Work',
        isTweet: false,
      },
      {
        url: 'https://example.com/2',
        title: 'Bookmark 2',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://byebyepaywall.com/en/',
        title: 'ByeByePaywall',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://example.com/3',
        title: 'Bookmark 3',
        addDate: null,
        folderPath: 'Bookmarks Bar/Random',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(true)
    expect(result.keeperCount).toBe(3) // First 3 bookmarks (up to and including byebyepaywall)
    expect(result.toCategorizeCount).toBe(1) // Last bookmark
  })

  it('should return boundaryFound false when Tools folder not found', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://example.com/1',
        title: 'Bookmark 1',
        addDate: null,
        folderPath: 'Bookmarks Bar/Work',
        isTweet: false,
      },
      {
        url: 'https://example.com/2',
        title: 'Bookmark 2',
        addDate: null,
        folderPath: 'Bookmarks Bar/Random',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(false)
    expect(result.keeperCount).toBe(0)
    expect(result.toCategorizeCount).toBe(2)
  })

  it('should return boundaryFound false when Tools folder exists but URL not found', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://example.com/1',
        title: 'Bookmark 1',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://different-url.com',
        title: 'Different URL',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://example.com/2',
        title: 'Bookmark 2',
        addDate: null,
        folderPath: 'Bookmarks Bar/Random',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(false)
    expect(result.keeperCount).toBe(0)
    expect(result.toCategorizeCount).toBe(3)
  })

  it('should handle boundary at the end of the bookmarks array', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://example.com/1',
        title: 'Bookmark 1',
        addDate: null,
        folderPath: 'Bookmarks Bar/Work',
        isTweet: false,
      },
      {
        url: 'https://byebyepaywall.com/en/',
        title: 'ByeByePaywall',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(true)
    expect(result.keeperCount).toBe(2)
    expect(result.toCategorizeCount).toBe(0)
  })

  it('should handle empty bookmarks array', () => {
    const bookmarks: Bookmark[] = []

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(false)
    expect(result.keeperCount).toBe(0)
    expect(result.toCategorizeCount).toBe(0)
  })

  it('should match Tools folder case-insensitively', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://example.com/1',
        title: 'Bookmark 1',
        addDate: null,
        folderPath: 'Bookmarks Bar/tools',
        isTweet: false,
      },
      {
        url: 'https://byebyepaywall.com/en/',
        title: 'ByeByePaywall',
        addDate: null,
        folderPath: 'Bookmarks Bar/tools',
        isTweet: false,
      },
      {
        url: 'https://example.com/2',
        title: 'Bookmark 2',
        addDate: null,
        folderPath: 'Bookmarks Bar/Random',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(true)
    expect(result.keeperCount).toBe(2)
    expect(result.toCategorizeCount).toBe(1)
  })

  it('should find last occurrence of byebyepaywall URL in Tools folder', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://byebyepaywall.com/en/',
        title: 'First ByeByePaywall',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://example.com/middle',
        title: 'Middle Bookmark',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://byebyepaywall.com/en/',
        title: 'Last ByeByePaywall',
        addDate: null,
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
      },
      {
        url: 'https://example.com/after',
        title: 'After Bookmark',
        addDate: null,
        folderPath: 'Bookmarks Bar/Random',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(true)
    expect(result.keeperCount).toBe(3) // Up to and including last byebyepaywall
    expect(result.toCategorizeCount).toBe(1)
  })

  it('should handle nested Tools folder path', () => {
    const bookmarks: Bookmark[] = [
      {
        url: 'https://example.com/1',
        title: 'Bookmark 1',
        addDate: null,
        folderPath: 'Bookmarks Bar',
        isTweet: false,
      },
      {
        url: 'https://byebyepaywall.com/en/',
        title: 'ByeByePaywall',
        addDate: null,
        folderPath: 'Bookmarks Bar/Work/Tools',
        isTweet: false,
      },
      {
        url: 'https://example.com/2',
        title: 'Bookmark 2',
        addDate: null,
        folderPath: 'Bookmarks Bar/Random',
        isTweet: false,
      },
    ]

    const result = detectBoundary(bookmarks)

    expect(result.boundaryFound).toBe(true)
    expect(result.keeperCount).toBe(2)
    expect(result.toCategorizeCount).toBe(1)
  })
})
