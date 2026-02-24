import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track all db operations
const mockDeleteWhere = vi.fn()
const mockInsertValues = vi.fn()
const mockUpdateSet = vi.fn()
const mockUpdateSetWhere = vi.fn()

vi.mock('@/db', () => ({
  db: {
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
    update: vi.fn(() => ({ set: mockUpdateSet })),
  },
}))

vi.mock('@/db/schema', () => ({
  bookmarks: { id: 'bookmarks.id', isCategorized: 'bookmarks.is_categorized', isSkipped: 'bookmarks.is_skipped' },
  bookmarkCategories: { bookmarkId: 'bookmark_categories.bookmark_id', categoryId: 'bookmark_categories.category_id' },
  categories: { id: 'categories.id', usageCount: 'categories.usage_count' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  inArray: vi.fn((...args: unknown[]) => ({ type: 'inArray', args })),
  sql: vi.fn(),
}))

describe('POST /api/bookmarks/categorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default success path
    mockDeleteWhere.mockResolvedValue(undefined)
    mockInsertValues.mockResolvedValue(undefined)
    mockUpdateSet.mockReturnValue({ where: mockUpdateSetWhere })
    mockUpdateSetWhere.mockResolvedValue(undefined)
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

  it('deletes existing categories then inserts new ones (idempotent)', async () => {
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
    // Verify delete was called
    expect(mockDeleteWhere).toHaveBeenCalled()
    // Then insert with junction records
    expect(mockInsertValues).toHaveBeenCalledWith([
      { bookmarkId: 'bookmark-1', categoryId: 'cat-1' },
      { bookmarkId: 'bookmark-1', categoryId: 'cat-2' },
    ])
  })

  it('sets isCategorized=true on bookmark', async () => {
    const { db } = await import('@/db')
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1'],
      }),
    })

    await POST(request as any)

    // Check that update was called for bookmarks
    expect(db.update).toHaveBeenCalled()
    expect(mockUpdateSet).toHaveBeenCalledWith({ isCategorized: true, isSkipped: false })
  })

  it('increments usageCount on selected categories', async () => {
    const { db } = await import('@/db')
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1', 'cat-2'],
      }),
    })

    await POST(request as any)

    // db.update should be called for both bookmarks and categories
    expect(db.update).toHaveBeenCalledTimes(2)
  })

  it('returns 500 if delete throws', async () => {
    mockDeleteWhere.mockRejectedValue(new Error('Database error'))

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
    expect(data.error).toBe('Internal server error')
  })

  it('returns 500 if bookmark_categories insert throws', async () => {
    mockInsertValues.mockRejectedValue(new Error('Database error'))

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
    expect(data.error).toBe('Internal server error')
  })

  it('returns 500 if bookmark update throws', async () => {
    mockUpdateSetWhere.mockRejectedValueOnce(new Error('Database error'))

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
    expect(data.error).toBe('Internal server error')
  })

  it('handles multiple category pairs (main + sub for each)', async () => {
    const { POST } = await import('./route')
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
    expect(mockInsertValues).toHaveBeenCalledWith([
      { bookmarkId: 'bookmark-1', categoryId: 'ai-id' },
      { bookmarkId: 'bookmark-1', categoryId: 'prompts-id' },
      { bookmarkId: 'bookmark-1', categoryId: 'learning-id' },
      { bookmarkId: 'bookmark-1', categoryId: 'threads-id' },
    ])
  })

  it('dedupes category IDs when same main category used twice', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['ai-id', 'prompts-id', 'ai-id', 'tools-id'],
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // Should dedupe to only 3 unique category IDs
    expect(mockInsertValues).toHaveBeenCalledWith([
      { bookmarkId: 'bookmark-1', categoryId: 'ai-id' },
      { bookmarkId: 'bookmark-1', categoryId: 'prompts-id' },
      { bookmarkId: 'bookmark-1', categoryId: 'tools-id' },
    ])
  })

  it('clears isSkipped flag when categorizing', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/categorize', {
      method: 'POST',
      body: JSON.stringify({
        bookmarkId: 'bookmark-1',
        categoryIds: ['cat-1'],
      }),
    })

    await POST(request as any)

    // Should update with isCategorized=true AND isSkipped=false
    expect(mockUpdateSet).toHaveBeenCalledWith({ isCategorized: true, isSkipped: false })
  })
})
