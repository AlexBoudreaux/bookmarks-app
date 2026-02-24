import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track db operations
const mockSet = vi.fn()
const mockWhere = vi.fn()

vi.mock('@/db', () => ({
  db: {
    update: vi.fn(() => ({ set: mockSet })),
  },
}))

vi.mock('@/db/schema', () => ({
  categories: { id: 'categories.id', sortOrder: 'categories.sort_order' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

describe('POST /api/categories/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSet.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue(undefined)
  })

  it('updates sortOrder for each category', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: ['cat-1', 'cat-2', 'cat-3'] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify each category was updated with correct sortOrder
    expect(mockSet).toHaveBeenCalledTimes(3)
    expect(mockSet).toHaveBeenNthCalledWith(1, { sortOrder: 0 })
    expect(mockSet).toHaveBeenNthCalledWith(2, { sortOrder: 1 })
    expect(mockSet).toHaveBeenNthCalledWith(3, { sortOrder: 2 })

    expect(mockWhere).toHaveBeenCalledTimes(3)
  })

  it('returns 400 if categoryIds is not an array', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: 'not-an-array' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('categoryIds must be a non-empty array')
  })

  it('returns 400 if categoryIds is empty', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: [] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('categoryIds must be a non-empty array')
  })

  it('returns 500 if any update fails', async () => {
    mockWhere
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Database error'))

    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: ['cat-1', 'cat-2'] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to reorder categories')
  })
})
