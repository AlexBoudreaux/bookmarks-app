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
  bookmarks: { id: 'bookmarks.id', notes: 'bookmarks.notes' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

describe('POST /api/bookmarks/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSet.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue(undefined)
  })

  it('returns 400 if bookmarkId is missing', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/notes', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Some notes' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('bookmarkId is required')
  })

  it('updates bookmark notes successfully', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/notes', {
      method: 'POST',
      body: JSON.stringify({ bookmarkId: 'test-bookmark-id', notes: 'Test notes content' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('allows empty notes to clear the field', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/notes', {
      method: 'POST',
      body: JSON.stringify({ bookmarkId: 'test-bookmark-id', notes: '' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('allows null notes to clear the field', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/notes', {
      method: 'POST',
      body: JSON.stringify({ bookmarkId: 'test-bookmark-id', notes: null }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 500 if db update throws', async () => {
    mockWhere.mockRejectedValue(new Error('Database error'))

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/notes', {
      method: 'POST',
      body: JSON.stringify({ bookmarkId: 'test-bookmark-id', notes: 'Some notes' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
