import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTsQuery, searchBookmarks } from './search-bookmarks'

// Mock Supabase client
const mockTextSearch = vi.fn()
const mockOrder = vi.fn()

vi.mock('./supabase', () => {
  const createBuilder = () => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      textSearch: mockTextSearch,
      order: mockOrder,
    }
    return builder
  }

  return {
    supabase: {
      from: vi.fn(() => createBuilder()),
    },
  }
})

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
  })

  it('returns empty array for empty query', async () => {
    const result = await searchBookmarks('')
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it('calls Supabase with correct parameters', async () => {
    const mockData = [
      { id: '1', url: 'https://example.com', title: 'Test', is_tweet: false },
    ]
    mockTextSearch.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockResolvedValue({ data: mockData, error: null })

    await searchBookmarks('react')

    expect(mockTextSearch).toHaveBeenCalledWith('fts', 'react:*')
    expect(mockOrder).toHaveBeenCalledWith('add_date', { ascending: false })
  })

  it('returns search results from Supabase', async () => {
    const mockData = [
      {
        id: '1',
        url: 'https://example.com',
        title: 'React Tutorial',
        is_tweet: false,
        is_categorized: true,
        domain: 'example.com',
        notes: null,
        og_image: null,
        add_date: '2024-01-01',
      },
    ]
    mockTextSearch.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockResolvedValue({ data: mockData, error: null })

    const result = await searchBookmarks('react')

    expect(result.data).toEqual(mockData)
    expect(result.error).toBeNull()
  })

  it('handles Supabase errors', async () => {
    const mockError = new Error('Database error')
    mockTextSearch.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockResolvedValue({ data: null, error: mockError })

    const result = await searchBookmarks('react')

    expect(result.data).toBeNull()
    expect(result.error).toEqual(mockError)
  })
})
