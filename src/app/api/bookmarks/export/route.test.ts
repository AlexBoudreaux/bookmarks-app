import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table)
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args)
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs)
              return { data: [], error: null }
            },
          }
        },
      }
    },
  },
}))

// Import after mocking
const { GET } = await import('./route')

describe('GET /api/bookmarks/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns HTML content type', async () => {
    const response = await GET()
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('includes content-disposition header for download', async () => {
    const response = await GET()
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="bookmarks.html"')
  })

  it('queries only keeper bookmarks', async () => {
    await GET()
    expect(mockFrom).toHaveBeenCalledWith('bookmarks')
    expect(mockSelect).toHaveBeenCalledWith('url, title, add_date, chrome_folder_path')
    expect(mockEq).toHaveBeenCalledWith('is_keeper', true)
  })

  it('returns valid Chrome bookmark HTML format', async () => {
    const response = await GET()
    const html = await response.text()
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(html).toContain('<TITLE>Bookmarks</TITLE>')
    expect(html).toContain('<H1>Bookmarks</H1>')
  })

  it('returns 500 on database error', async () => {
    // Create a fresh mock that returns an error
    vi.doMock('@/lib/supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ data: null, error: new Error('DB error') }),
          }),
        }),
      },
    }))

    // Re-import with error mock
    vi.resetModules()
    const { GET: GET_WITH_ERROR } = await import('./route')
    const response = await GET_WITH_ERROR()
    expect(response.status).toBe(500)
  })
})
