import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing route
vi.mock('@/lib/supabase', () => {
  const mockUpdate = vi.fn()
  const mockEq = vi.fn()

  return {
    supabase: {
      from: vi.fn(() => ({
        update: mockUpdate.mockReturnValue({
          eq: mockEq,
        }),
      })),
    },
    __mockUpdate: mockUpdate,
    __mockEq: mockEq,
  }
})

describe('POST /api/bookmarks/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    const { __mockEq } = await import('@/lib/supabase') as any
    __mockEq.mockReturnValue({ error: null })

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
    const { __mockEq } = await import('@/lib/supabase') as any
    __mockEq.mockReturnValue({ error: null })

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
    const { __mockEq } = await import('@/lib/supabase') as any
    __mockEq.mockReturnValue({ error: null })

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

  it('returns 500 if Supabase update fails', async () => {
    const { __mockEq } = await import('@/lib/supabase') as any
    __mockEq.mockReturnValue({ error: { message: 'Database error' } })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/bookmarks/notes', {
      method: 'POST',
      body: JSON.stringify({ bookmarkId: 'test-bookmark-id', notes: 'Some notes' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update notes')
  })
})
