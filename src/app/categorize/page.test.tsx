import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock CategorizeWrapper component
vi.mock('@/components/categorize/categorize-wrapper', () => ({
  CategorizeWrapper: ({
    categories,
    bookmarks,
    initialIndex,
  }: {
    categories: any[]
    bookmarks: any[]
    initialIndex: number
  }) => (
    <div data-testid="categorize-wrapper">
      <div data-testid="bookmark-count">{bookmarks.length}</div>
      <div data-testid="category-count">{categories.length}</div>
      <div data-testid="initial-index">{initialIndex}</div>
      {bookmarks.length > 0 && (
        <div data-testid="current-bookmark">
          {bookmarks[initialIndex]?.title} - {bookmarks[initialIndex]?.url}
        </div>
      )}
    </div>
  ),
}))

// Track saved position value for tests
let mockSavedPosition: { index: number } | null = null

// Mock Supabase - needs to return a chainable builder
const createMockBuilder = (tableName: string) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(() => ({
      data: tableName === 'settings' && mockSavedPosition ? { value: mockSavedPosition } : null,
      error: tableName === 'settings' && !mockSavedPosition ? { code: 'PGRST116' } : null,
    })),
    order: vi.fn(() => ({
      data: tableName === 'categories' ? [
        { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
        { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
        { id: '1a', name: 'Components', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
      ] : tableName === 'bookmarks' ? [
        { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', is_tweet: true, is_categorized: false, is_keeper: false, is_skipped: false },
        { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', is_tweet: false, is_categorized: false, is_keeper: false, is_skipped: false },
      ] : [],
      error: null,
    })),
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
    mockSavedPosition = null // Reset saved position for each test
  })

  it('renders page header', async () => {
    render(await CategorizePage())

    expect(screen.getByText('← Back')).toBeInTheDocument()
    expect(screen.getByText('Categorize Bookmarks')).toBeInTheDocument()
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

  it('passes initialIndex of 0 to CategorizeWrapper when no position saved', async () => {
    mockSavedPosition = null
    render(await CategorizePage())

    expect(screen.getByTestId('initial-index')).toHaveTextContent('0')
  })

  it('passes saved position as initialIndex to CategorizeWrapper', async () => {
    mockSavedPosition = { index: 1 }
    render(await CategorizePage())

    expect(screen.getByTestId('initial-index')).toHaveTextContent('1')
  })

  it('clamps saved position to valid range', async () => {
    // Saved position is 10 but only 2 bookmarks exist
    mockSavedPosition = { index: 10 }
    render(await CategorizePage())

    // Should be clamped to max valid index (1)
    expect(screen.getByTestId('initial-index')).toHaveTextContent('1')
  })

  it('has correct layout structure with main element', async () => {
    const { container } = render(await CategorizePage())

    const mainElement = container.querySelector('main')
    expect(mainElement).toBeInTheDocument()
  })
})
