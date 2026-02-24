import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTsQuery, searchBookmarks } from './search-bookmarks'

// Mock Drizzle db
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
  },
}))

vi.mock('@/db/schema', () => ({
  bookmarks: {
    id: 'bookmarks.id',
    url: 'bookmarks.url',
    title: 'bookmarks.title',
    isTweet: 'bookmarks.is_tweet',
    isCategorized: 'bookmarks.is_categorized',
    isKeeper: 'bookmarks.is_keeper',
    isSkipped: 'bookmarks.is_skipped',
    domain: 'bookmarks.domain',
    notes: 'bookmarks.notes',
    ogImage: 'bookmarks.og_image',
    addDate: 'bookmarks.add_date',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  sql: vi.fn(),
}))

describe('buildTsQuery', () => {
  it('converts single word to tsquery with prefix', () => {
    expect(buildTsQuery('react')).toBe('react:*')
  })

  it('converts multiple words to AND query', () => {
    expect(buildTsQuery('react hooks')).toBe('react:* & hooks:*')
  })

  it('handles extra whitespace', () => {
    expect(buildTsQuery('  react   hooks  ')).toBe('react:* & hooks:*')
  })

  it('removes special characters', () => {
    expect(buildTsQuery('react-hooks')).toBe('reacthooks:*')
  })

  it('removes punctuation', () => {
    expect(buildTsQuery('react, hooks!')).toBe('react:* & hooks:*')
  })

  it('returns empty string for empty query', () => {
    expect(buildTsQuery('')).toBe('')
    expect(buildTsQuery('   ')).toBe('')
  })

  it('handles query with only special characters', () => {
    expect(buildTsQuery('!@#$%')).toBe('')
  })

  it('converts to lowercase', () => {
    expect(buildTsQuery('React HOOKS')).toBe('react:* & hooks:*')
  })
})

describe('searchBookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
  })

  it('returns empty array for empty query', async () => {
    const result = await searchBookmarks('')
    expect(result).toEqual([])
  })

  it('calls db with correct chain', async () => {
    const mockData = [
      { id: '1', url: 'https://example.com', title: 'Test', isTweet: false },
    ]
    mockOrderBy.mockResolvedValue(mockData)

    const { db } = await import('@/db')
    await searchBookmarks('react')

    expect(db.select).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalled()
    expect(mockWhere).toHaveBeenCalled()
    expect(mockOrderBy).toHaveBeenCalled()
  })

  it('returns search results from Drizzle', async () => {
    const mockData = [
      {
        id: '1',
        url: 'https://example.com',
        title: 'React Tutorial',
        isTweet: false,
        isCategorized: true,
        domain: 'example.com',
        notes: null,
        ogImage: null,
        addDate: new Date('2024-01-01'),
      },
    ]
    mockOrderBy.mockResolvedValue(mockData)

    const result = await searchBookmarks('react')

    expect(result).toEqual(mockData)
  })

  it('handles Drizzle errors by throwing', async () => {
    mockOrderBy.mockRejectedValue(new Error('Database error'))

    await expect(searchBookmarks('react')).rejects.toThrow('Database error')
  })
})
