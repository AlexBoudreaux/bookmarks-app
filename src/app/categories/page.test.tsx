import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockCategories = [
    { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0 },
    { id: '2', name: 'Landing Pages', parent_id: '1', usage_count: 50, sort_order: 0 },
    { id: '3', name: 'Components', parent_id: '1', usage_count: 30, sort_order: 1 },
    { id: '4', name: 'AI Dev', parent_id: null, usage_count: 80, sort_order: 1 },
    { id: '5', name: 'Agents', parent_id: '4', usage_count: 40, sort_order: 0 },
  ]

  const mockBookmarkCategories = [
    { bookmark_id: 'b1', category_id: '2' },
    { bookmark_id: 'b2', category_id: '2' },
    { bookmark_id: 'b3', category_id: '5' },
  ]

  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.eq = () => builder
  builder.is = () => builder
  builder.order = () => ({ data: mockCategories, error: null })

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'bookmark_categories') {
          return {
            select: () => ({ data: mockBookmarkCategories, error: null }),
          }
        }
        return builder
      },
    },
  }
})

// Mock CategoriesContent component
vi.mock('@/components/categories/categories-content', () => ({
  CategoriesContent: ({ categories }: { categories: unknown[] }) => (
    <div data-testid="categories-content">
      Categories: {categories.length}
    </div>
  ),
}))

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
