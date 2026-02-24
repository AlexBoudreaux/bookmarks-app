import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Drizzle db
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockValues = vi.fn()
const mockReturning = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
    insert: vi.fn(() => ({ values: mockValues })),
  },
}))

vi.mock('@/db/schema', () => ({
  bookmarks: {
    url: 'bookmarks.url',
    addDate: 'bookmarks.add_date',
    chromeFolderPath: 'bookmarks.chrome_folder_path',
    isKeeper: 'bookmarks.is_keeper',
    isTweet: 'bookmarks.is_tweet',
    isCategorized: 'bookmarks.is_categorized',
    isSkipped: 'bookmarks.is_skipped',
    domain: 'bookmarks.domain',
  },
}))

vi.mock('drizzle-orm', () => ({
  inArray: vi.fn(),
}))

vi.mock('@/lib/extract-domain', () => ({
  extractDomain: (url: string) => {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  },
}))

// Import after mock is set up
const { POST } = await import('./route')

describe('POST /api/bookmarks/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves new bookmarks with isKeeper flag and domain extraction', async () => {
    // Mock select().from().where() chain for checking existing URLs
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([]) // No existing bookmarks

    // Mock insert().values().returning() chain
    mockValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: '1' }, { id: '2' }])

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
    expect(mockValues).toHaveBeenCalledTimes(1)

    // Verify the bookmarks array passed to values
    const insertCall = mockValues.mock.calls[0][0]
    expect(insertCall).toHaveLength(2)

    // First bookmark (keeper)
    expect(insertCall[0]).toMatchObject({
      url: 'https://github.com/user/repo',
      title: 'Test Repo',
      isKeeper: true,
      isTweet: false,
      domain: 'github.com',
      chromeFolderPath: 'Bookmarks Bar/Tools',
      isCategorized: false,
    })

    // Second bookmark (to categorize)
    expect(insertCall[1]).toMatchObject({
      url: 'https://twitter.com/user/status/123',
      title: 'Test Tweet',
      isKeeper: false,
      isTweet: true,
      domain: 'twitter.com',
      chromeFolderPath: 'Uncategorized',
      isCategorized: false,
    })
  })

  it('skips existing URLs to preserve categorizations', async () => {
    // Mock select().from().where() returns one existing URL
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([{ url: 'https://example.com/existing' }])

    // Mock insert().values().returning()
    mockValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: '1' }])

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
    const insertCall = mockValues.mock.calls[0][0]
    expect(insertCall).toHaveLength(1)
    expect(insertCall[0].url).toBe('https://example.com/new')
  })

  it('returns success with message when all bookmarks already exist', async () => {
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([{ url: 'https://example.com/page' }])

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

  it('returns error when db insert throws', async () => {
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([])

    mockValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockRejectedValue(new Error('Database error'))

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
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockRejectedValue(new Error('Database fetch error'))

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

  it('extracts domain correctly for various URL formats', async () => {
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([])

    mockValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }])

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

    const insertCall = mockValues.mock.calls[0][0]

    // www. should be removed
    expect(insertCall[0].domain).toBe('github.com')

    // x.com preserved
    expect(insertCall[1].domain).toBe('x.com')

    // subdomain and port handled correctly
    expect(insertCall[2].domain).toBe('api.example.com')
  })
})
