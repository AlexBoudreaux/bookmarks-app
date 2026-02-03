import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock CategorizeWrapper component
vi.mock('@/components/categorize/categorize-wrapper', () => ({
  CategorizeWrapper: ({
    categories,
    bookmarks,
  }: {
    categories: any[]
    bookmarks: any[]
  }) => (
    <div data-testid="categorize-wrapper">
      <div data-testid="bookmark-count">{bookmarks.length}</div>
      <div data-testid="category-count">{categories.length}</div>
      {bookmarks.length > 0 && (
        <div data-testid="first-bookmark">
          {bookmarks[0]?.title} - {bookmarks[0]?.url}
        </div>
      )}
    </div>
  ),
}))

// Track bookmark pagination calls to simulate pagination behavior
let bookmarkRangeCallCount = 0

// Mock Supabase - needs to return a chainable builder
const createMockBuilder = (tableName: string) => {
  const mockBookmarks = [
    { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', is_tweet: true, is_categorized: false, is_keeper: false, is_skipped: false },
    { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', is_tweet: false, is_categorized: false, is_keeper: false, is_skipped: false },
  ]

  const mockCategories = [
    { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
    { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
    { id: '1a', name: 'Components', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
  ]

  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => {
      // For bookmarks, return data on first call, empty on second (to stop pagination)
      if (tableName === 'bookmarks') {
        bookmarkRangeCallCount++
        return {
          data: bookmarkRangeCallCount === 1 ? mockBookmarks : [],
          error: null,
        }
      }
      return { data: [], error: null }
    }),
  }

  // For categories table, order() should return directly (no range)
  if (tableName === 'categories') {
    builder.order = vi.fn(() => ({
      data: mockCategories,
      error: null,
    }))
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((tableName: string) => createMockBuilder(tableName)),
  },
}))

import CategorizePage from './page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}))

describe('CategorizePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bookmarkRangeCallCount = 0 // Reset pagination counter
  })

  it('renders page header with navigation links', async () => {
    render(await CategorizePage())

    expect(screen.getByText('← Browse')).toBeInTheDocument()
    expect(screen.getByText('Categorize')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
  })

  it('passes bookmarks to CategorizeWrapper', async () => {
    render(await CategorizePage())

    expect(screen.getByTestId('categorize-wrapper')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-count')).toHaveTextContent('2')
  })

  it('passes categories to CategorizeWrapper', async () => {
    render(await CategorizePage())

    // Categories include both main and subcategories now
    expect(screen.getByTestId('category-count')).toHaveTextContent('3')
  })

  it('has correct layout structure with main element', async () => {
    const { container } = render(await CategorizePage())

    const mainElement = container.querySelector('main')
    expect(mainElement).toBeInTheDocument()
  })
})
