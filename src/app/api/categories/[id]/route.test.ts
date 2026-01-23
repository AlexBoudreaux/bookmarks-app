import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'bookmark_categories') {
        return {
          delete: () => ({
            eq: () => ({ error: null }),
          }),
        }
      }
      return {
        update: mockUpdate,
        delete: mockDelete,
      }
    },
  },
}))

describe('Categories API [id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      single: mockSingle,
    })
    mockSingle.mockResolvedValue({
      data: { id: '1', name: 'Updated Category', parent_id: null },
      error: null,
    })

    mockDelete.mockReturnValue({
      eq: () => ({ error: null }),
    })
  })

  describe('PATCH /api/categories/[id]', () => {
    it('updates category name', async () => {
      const { PATCH } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Category' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.category.name).toBe('Updated Category')
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Category' })
    })

    it('returns 400 if name is empty', async () => {
      const { PATCH } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

      expect(response.status).toBe(400)
    })

    it('returns 400 if name is whitespace only', async () => {
      const { PATCH } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

      expect(response.status).toBe(400)
    })

    it('returns 500 on database error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { PATCH } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Category' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/categories/[id]', () => {
    it('deletes category and returns success', async () => {
      const { DELETE } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('deletes subcategories first', async () => {
      const { DELETE } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'DELETE',
      })

      await DELETE(request, { params: Promise.resolve({ id: '1' }) })

      // Should have deleted subcategories (eq called with parent_id)
      expect(mockDelete).toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockDelete.mockReturnValue({
        eq: () => ({ error: { message: 'Database error' } }),
      })

      const { DELETE } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })

      expect(response.status).toBe(500)
    })
  })
})
