import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the BrowseContent client component
vi.mock('@/components/browse/browse-content', () => ({
  BrowseContent: ({
    categories,
    bookmarks,
  }: {
    categories: any[]
    bookmarks: any[]
  }) => (
    <div data-testid="browse-content">
      <div data-testid="bookmark-count">{bookmarks.length}</div>
      <div data-testid="category-count">{categories.length}</div>
    </div>
  ),
}))

// Mock Supabase with chainable builder
const createMockBuilder = (tableName: string) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => ({
      data: tableName === 'categories' ? [
        { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
        { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
        { id: '1a', name: 'Components', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
      ] : tableName === 'bookmarks' ? [
        { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', is_tweet: true, is_categorized: true, domain: 'twitter.com' },
        { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', is_tweet: false, is_categorized: true, domain: 'github.com' },
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

import BrowsePage from './page'

describe('BrowsePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page header with title', async () => {
    render(await BrowsePage())

    expect(screen.getByText('Bookmarks')).toBeInTheDocument()
  })

  it('has back link to home', async () => {
    render(await BrowsePage())

    const backLink = screen.getByText('← Back')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('passes bookmarks to BrowseContent', async () => {
    render(await BrowsePage())

    expect(screen.getByTestId('browse-content')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-count')).toHaveTextContent('2')
  })

  it('passes categories to BrowseContent', async () => {
    render(await BrowsePage())

    expect(screen.getByTestId('category-count')).toHaveTextContent('3')
  })

  it('has correct layout structure with sidebar and main area', async () => {
    const { container } = render(await BrowsePage())

    const mainElement = container.querySelector('main')
    expect(mainElement).toBeInTheDocument()
  })

  it('renders dark theme layout', async () => {
    const { container } = render(await BrowsePage())

    // Check for dark theme gradient background
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('bg-')
  })
})
