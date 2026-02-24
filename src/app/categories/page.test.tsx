import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockCategories = [
  { id: '1', name: 'UI', parentId: null, usageCount: 100, sortOrder: 0 },
  { id: '2', name: 'Landing Pages', parentId: '1', usageCount: 50, sortOrder: 0 },
  { id: '3', name: 'Components', parentId: '1', usageCount: 30, sortOrder: 1 },
  { id: '4', name: 'AI Dev', parentId: null, usageCount: 80, sortOrder: 1 },
  { id: '5', name: 'Agents', parentId: '4', usageCount: 40, sortOrder: 0 },
]

const mockBookmarkCategories = [
  { bookmarkId: 'b1', categoryId: '2' },
  { bookmarkId: 'b2', categoryId: '2' },
  { bookmarkId: 'b3', categoryId: '5' },
]

let selectCallCount = 0
const mockFrom = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
  },
}))

vi.mock('@/db/schema', () => ({
  categories: {
    sortOrder: 'categories.sort_order',
  },
  bookmarkCategories: {
    bookmarkId: 'bookmark_categories.bookmark_id',
    categoryId: 'bookmark_categories.category_id',
  },
}))

vi.mock('drizzle-orm', () => ({
  asc: vi.fn(),
}))

// Mock CategoriesContent component
vi.mock('@/components/categories/categories-content', () => ({
  CategoriesContent: ({ categories }: { categories: unknown[] }) => (
    <div data-testid="categories-content">
      Categories: {categories.length}
    </div>
  ),
}))

// Mock AddCategoryButton component
vi.mock('@/components/categories/add-category-button', () => ({
  AddCategoryButton: () => <button>Add Category</button>,
}))

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0

    // The page makes 2 db.select() calls:
    // 1. categories (with orderBy)
    // 2. bookmarkCategories (plain select from)
    mockFrom.mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // categories query: select().from().orderBy()
        return {
          orderBy: vi.fn().mockResolvedValue(mockCategories),
        }
      } else {
        // bookmarkCategories query: select().from()
        return Promise.resolve(mockBookmarkCategories)
      }
    })
  })

  it('renders page with header and back link', async () => {
    const { default: CategoriesPage } = await import('./page')
    render(await CategoriesPage())

    expect(screen.getByText('← Back')).toBeInTheDocument()
    expect(screen.getByText('Manage Categories')).toBeInTheDocument()
  })

  it('renders add category button in header', async () => {
    const { default: CategoriesPage } = await import('./page')
    render(await CategoriesPage())

    expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
  })

  it('passes categories to CategoriesContent', async () => {
    const { default: CategoriesPage } = await import('./page')
    render(await CategoriesPage())

    expect(screen.getByTestId('categories-content')).toBeInTheDocument()
    expect(screen.getByText('Categories: 5')).toBeInTheDocument()
  })

  it('shows description text about category management', async () => {
    const { default: CategoriesPage } = await import('./page')
    render(await CategoriesPage())

    expect(screen.getByText(/most-used categories appear first/i)).toBeInTheDocument()
  })
})
