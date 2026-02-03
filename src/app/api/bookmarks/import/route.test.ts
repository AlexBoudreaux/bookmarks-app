import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

// Import after mock is set up
const { POST } = await import('./route')

describe('POST /api/bookmarks/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves new bookmarks with is_keeper flag and domain extraction', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [], // No existing bookmarks
        error: null,
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }],
        error: null,
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookmarks') {
        return {
          select: mockSelect,
          insert: mockInsert,
        }
      }
      return {}
    })

    const bookmarks = [
      {
        url: 'https://github.com/user/repo',
        title: 'Test Repo',
        addDate: new Date('2024-01-01'),
        folderPath: 'Bookmarks Bar/Tools',
        isTweet: false,
        isKeeper: true,
      },
      {
        url: 'https://twitter.com/user/status/123',
        title: 'Test Tweet',
        addDate: new Date('2024-01-02'),
        folderPath: 'Uncategorized',
        isTweet: true,
        isKeeper: false,
      },
    ]

    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.imported).toBe(2)
    expect(data.skipped).toBe(0)

    // Verify insert was called
    expect(mockInsert).toHaveBeenCalledTimes(1)

    // Verify the bookmarks array passed to insert
    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall).toHaveLength(2)

    // First bookmark (keeper)
    expect(insertCall[0]).toMatchObject({
      url: 'https://github.com/user/repo',
      title: 'Test Repo',
      is_keeper: true,
      is_tweet: false,
      domain: 'github.com',
      chrome_folder_path: 'Bookmarks Bar/Tools',
      is_categorized: false,
    })

    // Second bookmark (to categorize)
    expect(insertCall[1]).toMatchObject({
      url: 'https://twitter.com/user/status/123',
      title: 'Test Tweet',
      is_keeper: false,
      is_tweet: true,
      domain: 'twitter.com',
      chrome_folder_path: 'Uncategorized',
      is_categorized: false,
    })
  })

  it('skips existing URLs to preserve categorizations', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [{ url: 'https://example.com/existing' }], // This URL already exists
        error: null,
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        error: null,
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookmarks') {
        return {
          select: mockSelect,
          insert: mockInsert,
        }
      }
      return {}
    })

    const bookmarks = [
      {
        url: 'https://example.com/existing', // Already in DB
        title: 'Existing',
        addDate: new Date('2024-01-01'),
        folderPath: 'Bookmarks Bar',
        isTweet: false,
        isKeeper: true,
      },
      {
        url: 'https://example.com/new', // New bookmark
        title: 'New Bookmark',
        addDate: new Date('2024-01-02'),
        folderPath: 'Bookmarks Bar',
        isTweet: false,
        isKeeper: false,
      },
    ]

    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.imported).toBe(1) // Only the new one
    expect(data.skipped).toBe(1) // The existing one was skipped

    // Verify only new bookmark was inserted
    const insertCall = mockInsert.mock.calls[0][0]
    expect(insertCall).toHaveLength(1)
    expect(insertCall[0].url).toBe('https://example.com/new')
  })

  it('returns success with message when all bookmarks already exist', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [{ url: 'https://example.com/page' }],
        error: null,
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookmarks') {
        return {
          select: mockSelect,
        }
      }
      return {}
    })

    const bookmarks = [
      {
        url: 'https://example.com/page',
        title: 'Example',
        addDate: new Date('2024-01-01'),
        folderPath: 'Bookmarks Bar',
        isTweet: false,
        isKeeper: true,
      },
    ]

    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.imported).toBe(0)
    expect(data.skipped).toBe(1)
    expect(data.message).toBe('All bookmarks already exist in database')
  })

  it('returns error when bookmarks array is missing', async () => {
    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns error when Supabase insert fails', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookmarks') {
        return {
          select: mockSelect,
          insert: mockInsert,
        }
      }
      return {}
    })

    const bookmarks = [
      {
        url: 'https://example.com',
        title: 'Test',
        addDate: new Date(),
        folderPath: 'Test',
        isTweet: false,
        isKeeper: true,
      },
    ]

    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('returns error when checking existing bookmarks fails', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database fetch error' },
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookmarks') {
        return {
          select: mockSelect,
        }
      }
      return {}
    })

    const bookmarks = [
      {
        url: 'https://example.com',
        title: 'Test',
        addDate: new Date(),
        folderPath: 'Test',
        isTweet: false,
        isKeeper: true,
      },
    ]

    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to check existing bookmarks')
  })

  it('extracts domain correctly for various URL formats', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        error: null,
      }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookmarks') {
        return {
          select: mockSelect,
          insert: mockInsert,
        }
      }
      return {}
    })

    const bookmarks = [
      {
        url: 'https://www.github.com/user/repo',
        title: 'Test 1',
        addDate: new Date(),
        folderPath: 'Test',
        isTweet: false,
        isKeeper: false,
      },
      {
        url: 'https://x.com/user/status/123',
        title: 'Test 2',
        addDate: new Date(),
        folderPath: 'Test',
        isTweet: true,
        isKeeper: false,
      },
      {
        url: 'https://api.example.com:8080/endpoint',
        title: 'Test 3',
        addDate: new Date(),
        folderPath: 'Test',
        isTweet: false,
        isKeeper: false,
      },
    ]

    const request = new Request('http://localhost:3000/api/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    })

    await POST(request)

    const insertCall = mockInsert.mock.calls[0][0]

    // www. should be removed
    expect(insertCall[0].domain).toBe('github.com')

    // x.com preserved
    expect(insertCall[1].domain).toBe('x.com')

    // subdomain and port handled correctly
    expect(insertCall[2].domain).toBe('api.example.com')
  })
})
