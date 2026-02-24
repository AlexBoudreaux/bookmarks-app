import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the BrowseContent client component
vi.mock('@/components/browse/browse-content', () => ({
  BrowseContent: ({
    categories,
    bookmarks,
    bookmarkCategories,
  }: {
    categories: any[]
    bookmarks: any[]
    bookmarkCategories: any[]
  }) => (
    <div data-testid="browse-content">
      <div data-testid="bookmark-count">{bookmarks.length}</div>
      <div data-testid="category-count">{categories.length}</div>
      <div data-testid="junction-count">{bookmarkCategories.length}</div>
    </div>
  ),
}))

// Mock the ExportButton client component
vi.mock('@/components/browse/export-button', () => ({
  ExportButton: () => <button data-testid="export-button">Export Keepers</button>,
}))

// Mock db queries
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()

const mockBookmarks = [
  { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', isTweet: true, isCategorized: true, domain: 'twitter.com' },
  { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', isTweet: false, isCategorized: true, domain: 'github.com' },
]

const mockCategories = [
  { id: '1', name: 'UI', parentId: null, usageCount: 100, sortOrder: 0, createdAt: new Date('2024-01-01') },
  { id: '2', name: 'AI Dev', parentId: null, usageCount: 90, sortOrder: 1, createdAt: new Date('2024-01-01') },
  { id: '1a', name: 'Components', parentId: '1', usageCount: 50, sortOrder: 0, createdAt: new Date('2024-01-01') },
]

const mockBookmarkCategories = [
  { bookmarkId: '1', categoryId: '1a' },
  { bookmarkId: '1', categoryId: '1' },
  { bookmarkId: '2', categoryId: '2' },
]

let selectCallCount = 0

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
  },
}))

vi.mock('@/db/schema', () => ({
  bookmarks: {
    isCategorized: 'bookmarks.is_categorized',
    isKeeper: 'bookmarks.is_keeper',
    isSkipped: 'bookmarks.is_skipped',
    addDate: 'bookmarks.add_date',
  },
  categories: {
    usageCount: 'categories.usage_count',
  },
  bookmarkCategories: {
    bookmarkId: 'bookmark_categories.bookmark_id',
    categoryId: 'bookmark_categories.category_id',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  desc: vi.fn(),
}))

import BrowsePage from './page'

describe('BrowsePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0

    // The page makes 3 db.select() calls:
    // 1. bookmarks (with where + orderBy)
    // 2. categories (with orderBy)
    // 3. bookmarkCategories (plain select)
    mockFrom.mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // bookmarks query: select().from().where().orderBy()
        return {
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue(mockBookmarks),
          })),
        }
      } else if (selectCallCount === 2) {
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

  it('passes bookmark_categories junction data to BrowseContent', async () => {
    render(await BrowsePage())

    expect(screen.getByTestId('junction-count')).toHaveTextContent('3')
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

  it('has export button in header', async () => {
    render(await BrowsePage())

    expect(screen.getByTestId('export-button')).toBeInTheDocument()
  })
})
