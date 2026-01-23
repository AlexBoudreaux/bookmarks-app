import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock open-graph-scraper
const mockOgs = vi.fn()
vi.mock('open-graph-scraper', () => ({
  default: mockOgs,
}))

// Mock Supabase
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate.mockReturnValue({
        eq: mockEq,
      }),
    })),
  },
}))

describe('POST /api/og', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if url is missing', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('url is required')
  })

  it('returns 400 if url is invalid', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-valid-url' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid URL')
  })

  it('fetches OG metadata successfully', async () => {
    mockOgs.mockResolvedValue({
      error: false,
      result: {
        ogTitle: 'Example Title',
        ogDescription: 'Example description',
        ogImage: [{ url: 'https://example.com/image.jpg' }],
        ogSiteName: 'Example Site',
        favicon: '/favicon.ico',
        success: true,
      },
    })
    mockEq.mockReturnValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title).toBe('Example Title')
    expect(data.description).toBe('Example description')
    expect(data.image).toBe('https://example.com/image.jpg')
    expect(data.siteName).toBe('Example Site')
  })

  it('falls back to Twitter card data if OG is missing', async () => {
    mockOgs.mockResolvedValue({
      error: false,
      result: {
        twitterTitle: 'Twitter Title',
        twitterDescription: 'Twitter description',
        twitterImage: [{ url: 'https://example.com/twitter-image.jpg' }],
        success: true,
      },
    })
    mockEq.mockReturnValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title).toBe('Twitter Title')
    expect(data.description).toBe('Twitter description')
    expect(data.image).toBe('https://example.com/twitter-image.jpg')
  })

  it('caches og_image to bookmarks table when bookmarkId provided', async () => {
    mockOgs.mockResolvedValue({
      error: false,
      result: {
        ogTitle: 'Example Title',
        ogImage: [{ url: 'https://example.com/image.jpg' }],
        success: true,
      },
    })
    mockEq.mockReturnValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/article',
        bookmarkId: 'test-bookmark-id',
      }),
    })

    const response = await POST(request as any)
    await response.json()

    expect(mockUpdate).toHaveBeenCalledWith({ og_image: 'https://example.com/image.jpg' })
    expect(mockEq).toHaveBeenCalledWith('id', 'test-bookmark-id')
  })

  it('does not cache if no bookmarkId provided', async () => {
    mockOgs.mockResolvedValue({
      error: false,
      result: {
        ogTitle: 'Example Title',
        ogImage: [{ url: 'https://example.com/image.jpg' }],
        success: true,
      },
    })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    await POST(request as any)

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 500 if fetch fails', async () => {
    mockOgs.mockResolvedValue({
      error: true,
      result: { error: 'Failed to fetch' },
    })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch metadata')
  })

  it('returns partial data if some fields are missing', async () => {
    mockOgs.mockResolvedValue({
      error: false,
      result: {
        ogTitle: 'Title Only',
        success: true,
      },
    })
    mockEq.mockReturnValue({ error: null })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title).toBe('Title Only')
    expect(data.description).toBeUndefined()
    expect(data.image).toBeUndefined()
  })

  it('handles OG scraper throwing an exception', async () => {
    mockOgs.mockRejectedValue(new Error('Network error'))

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/article' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch metadata')
  })

  it('logs but continues if caching to DB fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockOgs.mockResolvedValue({
      error: false,
      result: {
        ogTitle: 'Example Title',
        ogImage: [{ url: 'https://example.com/image.jpg' }],
        success: true,
      },
    })
    mockEq.mockReturnValue({ error: { message: 'DB error' } })

    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/og', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/article',
        bookmarkId: 'test-bookmark-id',
      }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    // Should still return success since OG fetch worked
    expect(response.status).toBe(200)
    expect(data.title).toBe('Example Title')
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
