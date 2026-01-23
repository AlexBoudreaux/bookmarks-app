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

  it('saves bookmarks with is_keeper flag and domain extraction', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }],
        error: null,
      }),
    })

    mockFrom.mockReturnValue({
      upsert: mockUpsert,
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

    // Verify upsert was called
    expect(mockUpsert).toHaveBeenCalledTimes(1)

    // Verify the bookmarks array passed to upsert
    const upsertCall = mockUpsert.mock.calls[0][0]
    expect(upsertCall).toHaveLength(2)

    // First bookmark (keeper)
    expect(upsertCall[0]).toMatchObject({
      url: 'https://github.com/user/repo',
      title: 'Test Repo',
      is_keeper: true,
      is_tweet: false,
      domain: 'github.com',
      chrome_folder_path: 'Bookmarks Bar/Tools',
      is_categorized: false,
    })

    // Second bookmark (to categorize)
    expect(upsertCall[1]).toMatchObject({
      url: 'https://twitter.com/user/status/123',
      title: 'Test Tweet',
      is_keeper: false,
      is_tweet: true,
      domain: 'twitter.com',
      chrome_folder_path: 'Uncategorized',
      is_categorized: false,
    })
  })

  it('handles duplicate URLs with upsert', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        error: null,
      }),
    })

    mockFrom.mockReturnValue({
      upsert: mockUpsert,
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

    expect(response.status).toBe(200)

    // Verify upsert was called with onConflict option
    const upsertOptions = mockUpsert.mock.calls[0][1]
    expect(upsertOptions).toMatchObject({
      onConflict: 'url',
    })
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

  it('returns error when Supabase fails', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })

    mockFrom.mockReturnValue({
      upsert: mockUpsert,
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

  it('extracts domain correctly for various URL formats', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        error: null,
      }),
    })

    mockFrom.mockReturnValue({
      upsert: mockUpsert,
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

    const upsertCall = mockUpsert.mock.calls[0][0]

    // www. should be removed
    expect(upsertCall[0].domain).toBe('github.com')

    // x.com preserved
    expect(upsertCall[1].domain).toBe('x.com')

    // subdomain and port handled correctly
    expect(upsertCall[2].domain).toBe('api.example.com')
  })
})
