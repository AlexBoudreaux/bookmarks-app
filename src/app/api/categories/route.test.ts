import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions at module level
const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()

// Mock Supabase client
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    },
  }
})

describe('POST /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the chain for each test
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  it('creates a new main category when no parent_id provided', async () => {
    const newCategory = {
      id: 'new-cat-id',
      name: 'Test Category',
      parent_id: null,
      usage_count: 0,
      sort_order: 0,
      created_at: '2026-01-23T00:00:00.000Z',
    }

    mockSingle.mockResolvedValueOnce({ data: newCategory, error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Category' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.category).toEqual(newCategory)
    expect(mockInsert).toHaveBeenCalledWith({ name: 'Test Category' })
  })

  it('creates a new subcategory when parent_id provided', async () => {
    const newCategory = {
      id: 'new-sub-id',
      name: 'Test Subcategory',
      parent_id: 'parent-cat-id',
      usage_count: 0,
      sort_order: 0,
      created_at: '2026-01-23T00:00:00.000Z',
    }

    mockSingle.mockResolvedValueOnce({ data: newCategory, error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Subcategory', parent_id: 'parent-cat-id' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.category).toEqual(newCategory)
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Test Subcategory',
      parent_id: 'parent-cat-id',
    })
  })

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Category name is required')
  })

  it('returns 400 when name is empty string', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  ' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Category name is required')
  })

  it('returns 500 when database insert fails', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Category' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create category')
  })
})
