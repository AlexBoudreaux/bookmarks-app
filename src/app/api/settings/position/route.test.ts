import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track db operations
const mockSelectFrom = vi.fn()
const mockSelectWhere = vi.fn()
const mockInsertValues = vi.fn()
const mockOnConflictDoUpdate = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockSelectFrom })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}))

vi.mock('@/db/schema', () => ({
  settings: { key: 'settings.key', value: 'settings.value', updatedAt: 'settings.updated_at' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

describe('GET /api/settings/position', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere })
  })

  it('returns saved position when it exists', async () => {
    mockSelectWhere.mockResolvedValue([
      { value: { index: 42 } },
    ])

    const { GET } = await import('./route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.index).toBe(42)
  })

  it('returns index 0 when no position saved', async () => {
    mockSelectWhere.mockResolvedValue([])

    const { GET } = await import('./route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.index).toBe(0)
  })

  it('returns 500 on database error', async () => {
    mockSelectWhere.mockRejectedValue(new Error('Database error'))

    const { GET } = await import('./route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

describe('POST /api/settings/position', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })
    mockOnConflictDoUpdate.mockResolvedValue(undefined)
  })

  it('saves position to settings table', async () => {
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
    expect(mockInsertValues).toHaveBeenCalledWith({
      key: 'categorize_position',
      value: { index: 15 },
      updatedAt: expect.any(Date),
    })
    expect(mockOnConflictDoUpdate).toHaveBeenCalled()
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
    mockOnConflictDoUpdate.mockRejectedValue(new Error('Database error'))

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
