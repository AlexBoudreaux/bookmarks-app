import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track db operations
const mockValues = vi.fn()
const mockReturning = vi.fn()

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: mockValues })),
  },
}))

vi.mock('@/db/schema', () => ({
  categories: { id: 'categories.id', name: 'categories.name', parentId: 'categories.parent_id' },
}))

describe('POST /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValues.mockReturnValue({ returning: mockReturning })
  })

  it('creates a new main category when no parent_id provided', async () => {
    const newCategory = {
      id: 'new-cat-id',
      name: 'Test Category',
      parentId: null,
      usageCount: 0,
      sortOrder: 0,
      createdAt: new Date('2026-01-23T00:00:00.000Z'),
    }

    mockReturning.mockResolvedValueOnce([newCategory])

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Category' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.category).toBeDefined()
    expect(mockValues).toHaveBeenCalledWith({ name: 'Test Category' })
  })

  it('creates a new subcategory when parent_id provided', async () => {
    const newCategory = {
      id: 'new-sub-id',
      name: 'Test Subcategory',
      parentId: 'parent-cat-id',
      usageCount: 0,
      sortOrder: 0,
      createdAt: new Date('2026-01-23T00:00:00.000Z'),
    }

    mockReturning.mockResolvedValueOnce([newCategory])

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Subcategory', parent_id: 'parent-cat-id' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.category).toBeDefined()
    expect(mockValues).toHaveBeenCalledWith({
      name: 'Test Subcategory',
      parentId: 'parent-cat-id',
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
    mockReturning.mockRejectedValueOnce(new Error('Database error'))

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
