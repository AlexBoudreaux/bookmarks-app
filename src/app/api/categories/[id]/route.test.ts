import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track db operations
const mockUpdateSet = vi.fn()
const mockUpdateWhere = vi.fn()
const mockReturning = vi.fn()
const mockDeleteWhere = vi.fn()

vi.mock('@/db', () => ({
  db: {
    update: vi.fn(() => ({ set: mockUpdateSet })),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
  },
}))

vi.mock('@/db/schema', () => ({
  categories: { id: 'categories.id', name: 'categories.name', parentId: 'categories.parent_id' },
  bookmarkCategories: { categoryId: 'bookmark_categories.category_id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

describe('Categories API [id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default success path for update chain
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdateWhere.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: '1', name: 'Updated Category', parentId: null }])

    // Default success path for delete
    mockDeleteWhere.mockResolvedValue(undefined)
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
      expect(mockUpdateSet).toHaveBeenCalledWith({ name: 'Updated Category' })
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
      mockReturning.mockRejectedValue(new Error('Database error'))

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
      const { db } = await import('@/db')
      const { DELETE } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'DELETE',
      })

      await DELETE(request, { params: Promise.resolve({ id: '1' }) })

      // Should have called delete multiple times (subcategories, bookmark_categories, and category itself)
      expect(db.delete).toHaveBeenCalledTimes(3)
    })

    it('returns 500 on database error', async () => {
      mockDeleteWhere.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('./route')

      const request = new Request('http://localhost/api/categories/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })

      expect(response.status).toBe(500)
    })
  })
})
