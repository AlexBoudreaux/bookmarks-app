import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the search function
const mockSearchBookmarks = vi.fn()

vi.mock('@/lib/search-bookmarks', () => ({
  searchBookmarks: (...args: unknown[]) => mockSearchBookmarks(...args),
}))

describe('GET /api/bookmarks/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no query provided', async () => {
    const { GET } = await import('./route')
    const request = new NextRequest('http://localhost:3000/api/bookmarks/search')
    const response = await GET(request)
    const json = await response.json()

    expect(json.data).toEqual([])
    expect(json.error).toBeNull()
    expect(mockSearchBookmarks).not.toHaveBeenCalled()
  })

  it('returns empty array when query is whitespace', async () => {
    const { GET } = await import('./route')
    const request = new NextRequest('http://localhost:3000/api/bookmarks/search?q=   ')
    const response = await GET(request)
    const json = await response.json()

    expect(json.data).toEqual([])
    expect(json.error).toBeNull()
    expect(mockSearchBookmarks).not.toHaveBeenCalled()
  })

  it('calls searchBookmarks with query', async () => {
    mockSearchBookmarks.mockResolvedValue({
      data: [{ id: '1', title: 'React Hooks' }],
      error: null,
    })

    const { GET } = await import('./route')
    const request = new NextRequest('http://localhost:3000/api/bookmarks/search?q=react')
    const response = await GET(request)
    const json = await response.json()

    expect(mockSearchBookmarks).toHaveBeenCalledWith('react')
    expect(json.data).toEqual([{ id: '1', title: 'React Hooks' }])
    expect(json.error).toBeNull()
  })

  it('returns 500 on search error', async () => {
    mockSearchBookmarks.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    })

    const { GET } = await import('./route')
    const request = new NextRequest('http://localhost:3000/api/bookmarks/search?q=react')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Search failed')
  })

  it('handles URL-encoded query strings', async () => {
    mockSearchBookmarks.mockResolvedValue({ data: [], error: null })

    const { GET } = await import('./route')
    const request = new NextRequest('http://localhost:3000/api/bookmarks/search?q=react%20hooks')
    await GET(request)

    expect(mockSearchBookmarks).toHaveBeenCalledWith('react hooks')
  })
})
