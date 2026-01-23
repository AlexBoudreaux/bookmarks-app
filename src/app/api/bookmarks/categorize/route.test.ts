import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing route
vi.mock('@/lib/supabase', () => {
  const mockUpdate = vi.fn()
  const mockEq = vi.fn()
  const mockInsert = vi.fn()
  const mockRpc = vi.fn()

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'bookmarks') {
          return {
            update: mockUpdate.mockReturnValue({
              eq: mockEq,
            }),
          }
        }
        if (table === 'bookmark_categories') {
          return {
            insert: mockInsert,
          }
        }
        return {}
      }),
      rpc: mockRpc,
    },
    __mockUpdate: mockUpdate,
    __mockEq: mockEq,
    __mockInsert: mockInsert,
    __mockRpc: mockRpc,
  }
})

describe('POST /api/bookmarks/categorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if bookmarkId is missing', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({ categoryIds: ['cat-1'] }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('bookmarkId is required')
  })

  it('returns 400 if categoryIds is missing or empty', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({ bookmarkId: 'bookmark-1' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('categoryIds must be a non-empty array')
  })

  it('saves bookmark_categories junction records', async () => {
    const { __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: null })
    __mockEq.mockReturnValue({ error: null })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1', 'cat-2'],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(__mockInsert).toHaveBeenCalledWith([
      { bookmark_id: 'bookmark-1', category_id: 'cat-1' },
      { bookmark_id: 'bookmark-1', category_id: 'cat-2' },
    ])
  })

  it('sets is_categorized=true on bookmark', async () => {
    const { supabase, __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: null })
    __mockEq.mockReturnValue({ error: null })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1'],
      }),
    })

    await POST(request as any)

    // Check that from('bookmarks') was called
    expect(supabase.from).toHaveBeenCalledWith('bookmarks')
    expect(__mockEq).toHaveBeenCalledWith('id', 'bookmark-1')
  })

  it('increments usage_count on selected categories via RPC', async () => {
    const { supabase, __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: null })
    __mockEq.mockReturnValue({ error: null })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1', 'cat-2'],
      }),
    })

    await POST(request as any)

    // Should call RPC function to increment usage counts
    expect(supabase.rpc).toHaveBeenCalledWith('increment_usage_counts', {
      category_ids: ['cat-1', 'cat-2'],
    })
  })

  it('returns 500 if bookmark_categories insert fails', async () => {
    const { __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: { message: 'Database error' } })
    __mockEq.mockReturnValue({ error: null })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1'],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save categorization')
  })

  it('returns 500 if bookmark update fails', async () => {
    const { __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: null })
    __mockEq.mockReturnValue({ error: { message: 'Database error' } })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1'],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to mark bookmark as categorized')
  })

  it('handles multiple category pairs (main + sub for each)', async () => {
    const { __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: null })
    __mockEq.mockReturnValue({ error: null })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    // Simulate 2 category pairs: AI > Prompts, Learning > Threads
    // categoryIds would be [main1-id, sub1-id, main2-id, sub2-id]
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['ai-id', 'prompts-id', 'learning-id', 'threads-id'],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(__mockInsert).toHaveBeenCalledWith([
      { bookmark_id: 'bookmark-1', category_id: 'ai-id' },
      { bookmark_id: 'bookmark-1', category_id: 'prompts-id' },
      { bookmark_id: 'bookmark-1', category_id: 'learning-id' },
      { bookmark_id: 'bookmark-1', category_id: 'threads-id' },
    ])
  })

  it('clears is_skipped flag when categorizing', async () => {
    const { __mockUpdate, __mockInsert, __mockEq, __mockRpc } = await import('@/lib/supabase') as any
    __mockInsert.mockReturnValue({ error: null })
    __mockEq.mockReturnValue({ error: null })
    __mockRpc.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1'],
      }),
    })

    await POST(request as any)

    // Should update with is_categorized=true AND is_skipped=false
    expect(__mockUpdate).toHaveBeenCalledWith({
      is_categorized: true,
      is_skipped: false,
    })
  })
})
