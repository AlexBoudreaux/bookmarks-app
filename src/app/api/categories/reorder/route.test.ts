import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: mockUpdate,
    }),
  },
}))

describe('POST /api/categories/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ error: null })
  })

  it('updates sort_order for each category', async () => {
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

    // Verify each category was updated with correct sort_order
    expect(mockUpdate).toHaveBeenCalledTimes(3)
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { sort_order: 0 })
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { sort_order: 1 })
    expect(mockUpdate).toHaveBeenNthCalledWith(3, { sort_order: 2 })

    expect(mockEq).toHaveBeenCalledTimes(3)
    expect(mockEq).toHaveBeenNthCalledWith(1, 'id', 'cat-1')
    expect(mockEq).toHaveBeenNthCalledWith(2, 'id', 'cat-2')
    expect(mockEq).toHaveBeenNthCalledWith(3, 'id', 'cat-3')
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
    mockEq
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'Database error' } })

    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: ['cat-1', 'cat-2'] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update category order')
  })
})
