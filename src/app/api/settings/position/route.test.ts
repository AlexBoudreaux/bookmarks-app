import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'settings') {
        return {
          select: mockSelect,
          upsert: mockUpsert,
        }
      }
      return {}
    },
  },
}))

describe('GET /api/settings/position', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
  })

  it('returns saved position when it exists', async () => {
    mockSingle.mockResolvedValue({
      data: { key: 'categorize_position', value: { index: 42 } },
      error: null,
    })

    const { GET } = await import('./route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.index).toBe(42)
    expect(mockSelect).toHaveBeenCalledWith('value')
    expect(mockEq).toHaveBeenCalledWith('key', 'categorize_position')
  })

  it('returns index 0 when no position saved', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })

    const { GET } = await import('./route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.index).toBe(0)
  })

  it('returns 500 on database error', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'UNKNOWN', message: 'Database error' },
    })

    const { GET } = await import('./route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

describe('POST /api/settings/position', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves position to settings table', async () => {
    mockUpsert.mockResolvedValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/settings/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: 15 }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        key: 'categorize_position',
        value: { index: 15 },
        updated_at: expect.any(String),
      },
      { onConflict: 'key' }
    )
  })

  it('returns 400 when index is missing', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/settings/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('index is required')
  })

  it('returns 400 when index is negative', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/settings/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: -1 }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 500 on database error', async () => {
    mockUpsert.mockResolvedValue({
      error: { code: 'UNKNOWN', message: 'Database error' },
    })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/settings/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: 10 }),
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})
