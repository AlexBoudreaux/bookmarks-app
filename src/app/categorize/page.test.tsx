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

const mockBookmarks = [
  { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', isTweet: true, isCategorized: false, isKeeper: false, isSkipped: false },
  { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', isTweet: false, isCategorized: false, isKeeper: false, isSkipped: false },
]

const mockCategories = [
  { id: '1', name: 'UI', parentId: null, usageCount: 100, sortOrder: 0, createdAt: new Date('2024-01-01') },
  { id: '2', name: 'AI Dev', parentId: null, usageCount: 90, sortOrder: 1, createdAt: new Date('2024-01-01') },
  { id: '1a', name: 'Components', parentId: '1', usageCount: 50, sortOrder: 0, createdAt: new Date('2024-01-01') },
]

let selectCallCount = 0
const mockFrom = vi.fn()

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
    chromeFolderPath: 'bookmarks.chrome_folder_path',
    addDate: 'bookmarks.add_date',
  },
  categories: {
    usageCount: 'categories.usage_count',
    sortOrder: 'categories.sort_order',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  ne: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
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
    selectCallCount = 0

    // The page makes 2 db.select() calls:
    // 1. uncategorized bookmarks (with where + orderBy)
    // 2. categories (with orderBy)
    mockFrom.mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // bookmarks query: select().from().where().orderBy()
        return {
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue(mockBookmarks),
          })),
        }
      } else {
        // categories query: select().from().orderBy()
        return {
          orderBy: vi.fn().mockResolvedValue(mockCategories),
        }
      }
    })
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
