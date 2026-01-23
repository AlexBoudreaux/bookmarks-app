import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the child components
vi.mock('./tweet-card', () => ({
  TweetCard: ({ url, title }: { url: string; title: string | null }) => (
    <div data-testid="tweet-card">TweetCard: {title}</div>
  ),
}))

vi.mock('./browse-link-card', () => ({
  BrowseLinkCard: ({ url, title }: { url: string; title: string | null }) => (
    <div data-testid="browse-link-card">LinkCard: {title}</div>
  ),
}))

// Sample test data
const mockCategories = [
  { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
  { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
  { id: '1a', name: 'Components', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
  { id: '1b', name: 'Landing Pages', parent_id: '1', usage_count: 30, sort_order: 1, created_at: '2024-01-01' },
  { id: '2a', name: 'Agents', parent_id: '2', usage_count: 40, sort_order: 0, created_at: '2024-01-01' },
]

const mockBookmarks = [
  { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', is_tweet: true, is_categorized: true, domain: 'twitter.com', notes: null, og_image: null, add_date: null },
  { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', is_tweet: false, is_categorized: true, domain: 'github.com', notes: null, og_image: null, add_date: null },
  { id: '3', url: 'https://example.com/article', title: 'Example Article', is_tweet: false, is_categorized: true, domain: 'example.com', notes: null, og_image: null, add_date: null },
]

// Junction table data linking bookmarks to categories
const mockBookmarkCategories = [
  { bookmark_id: '1', category_id: '1a' }, // Test Tweet -> UI/Components
  { bookmark_id: '1', category_id: '1' },  // Test Tweet -> UI (main)
  { bookmark_id: '2', category_id: '2a' }, // GitHub Repo -> AI Dev/Agents
  { bookmark_id: '2', category_id: '2' },  // GitHub Repo -> AI Dev (main)
  { bookmark_id: '3', category_id: '1b' }, // Example Article -> UI/Landing Pages
  { bookmark_id: '3', category_id: '1' },  // Example Article -> UI (main)
]

import { BrowseContent } from './browse-content'

describe('BrowseContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sidebar with category tree', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    // Check sidebar exists
    expect(screen.getByRole('navigation')).toBeInTheDocument()

    // Check "All Bookmarks" option
    expect(screen.getByText('All Bookmarks')).toBeInTheDocument()
  })

  it('displays main categories in sidebar', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    expect(screen.getByText('UI')).toBeInTheDocument()
    expect(screen.getByText('AI Dev')).toBeInTheDocument()
  })

  it('renders search bar', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('renders bookmark grid placeholder', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    expect(screen.getByTestId('bookmark-grid')).toBeInTheDocument()
  })

  it('displays filter chips area', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    expect(screen.getByTestId('filter-area')).toBeInTheDocument()
  })

  it('shows bookmark count in sidebar for All Bookmarks', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    // Should show count of all bookmarks
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('sidebar can be collapsed', async () => {
    const user = userEvent.setup()
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    const toggleButton = screen.getByLabelText(/toggle sidebar/i)
    expect(toggleButton).toBeInTheDocument()

    await user.click(toggleButton)

    // After collapse, sidebar should be narrower (controlled by state)
    const sidebar = screen.getByRole('navigation')
    expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  })

  it('clicking category filters bookmarks', async () => {
    const user = userEvent.setup()
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    // Find the button that contains the UI text
    const uiText = screen.getByText('UI')
    const uiButton = uiText.closest('button')
    expect(uiButton).toBeDefined()

    await user.click(uiButton!)

    // The button should now have data-selected=true
    expect(uiButton).toHaveAttribute('data-selected', 'true')
  })

  it('has responsive grid layout', () => {
    const { container } = render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    const grid = container.querySelector('[data-testid="bookmark-grid"]')
    expect(grid).toBeInTheDocument()
    // Grid should have responsive classes
    expect(grid?.className).toMatch(/grid/)
  })

  // BRW-002: Category tree sidebar tests
  describe('Category tree filtering', () => {
    it('click main category expands subcategories', async () => {
      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Find expand button for UI category
      const expandButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && btn.closest('[class*="flex items-center"]')?.textContent?.includes('UI')
      )
      expect(expandButton).toBeDefined()

      // Click expand button
      await user.click(expandButton!)

      // Subcategories should now be visible
      expect(screen.getByText('Components')).toBeInTheDocument()
      expect(screen.getByText('Landing Pages')).toBeInTheDocument()
    })

    it('clicking main category filters to all bookmarks in that category', async () => {
      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Initially all 3 bookmarks visible
      const grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(3)

      // Click UI category
      const uiButton = screen.getByText('UI').closest('button')
      await user.click(uiButton!)

      // Should filter to bookmarks in UI category (Test Tweet and Example Article)
      expect(within(grid).getAllByRole('article')).toHaveLength(2)
      expect(within(grid).getByText('TweetCard: Test Tweet')).toBeInTheDocument()
      expect(within(grid).getByText('LinkCard: Example Article')).toBeInTheDocument()
      expect(within(grid).queryByText('LinkCard: GitHub Repo')).not.toBeInTheDocument()
    })

    it('clicking subcategory filters to just that subcategory', async () => {
      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Expand UI category first
      const expandButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && btn.closest('[class*="flex items-center"]')?.textContent?.includes('UI')
      )
      await user.click(expandButton!)

      // Click Components subcategory
      const componentsButton = screen.getByText('Components').closest('button')
      await user.click(componentsButton!)

      // Should filter to only Test Tweet (in UI/Components)
      const grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(1)
      expect(within(grid).getByText('TweetCard: Test Tweet')).toBeInTheDocument()
    })

    it('shows bookmark count per category', () => {
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // UI has 2 bookmarks (Test Tweet and Example Article)
      // AI Dev has 1 bookmark (GitHub Repo)
      // Find the counts displayed next to category names
      const sidebar = screen.getByRole('navigation')

      // UI should show count of 2
      const uiRow = within(sidebar).getByText('UI').closest('div')
      expect(within(uiRow!).getByText('2')).toBeInTheDocument()

      // AI Dev should show count of 1
      const aiRow = within(sidebar).getByText('AI Dev').closest('div')
      expect(within(aiRow!).getByText('1')).toBeInTheDocument()
    })

    it('All Bookmarks option clears category filter', async () => {
      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Click UI to filter
      const uiButton = screen.getByText('UI').closest('button')
      await user.click(uiButton!)

      // Should show 2 bookmarks
      let grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(2)

      // Click All Bookmarks
      const allButton = screen.getByText('All Bookmarks').closest('button')
      await user.click(allButton!)

      // Should show all 3 bookmarks again
      grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(3)
    })
  })

  // BRW-003: Bookmark grid display tests
  describe('Bookmark grid display', () => {
    it('renders TweetCard for tweet bookmarks', () => {
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Should use TweetCard for tweet bookmark
      expect(screen.getByTestId('tweet-card')).toBeInTheDocument()
      expect(screen.getByText('TweetCard: Test Tweet')).toBeInTheDocument()
    })

    it('renders BrowseLinkCard for non-tweet bookmarks', () => {
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Should use BrowseLinkCard for non-tweet bookmarks
      const linkCards = screen.getAllByTestId('browse-link-card')
      expect(linkCards).toHaveLength(2)
      expect(screen.getByText('LinkCard: GitHub Repo')).toBeInTheDocument()
      expect(screen.getByText('LinkCard: Example Article')).toBeInTheDocument()
    })

    it('shows load more button when there are more bookmarks', () => {
      // Create 15 bookmarks (more than ITEMS_PER_PAGE of 12)
      const manyBookmarks = Array.from({ length: 15 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        is_tweet: false,
        is_categorized: true,
        domain: 'example.com',
        notes: null,
        og_image: null,
        add_date: null,
      }))

      render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

      // Should show load more button
      expect(screen.getByTestId('load-more-button')).toBeInTheDocument()
      expect(screen.getByText(/3 remaining/)).toBeInTheDocument()
    })

    it('does not show load more button when all bookmarks displayed', () => {
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Only 3 bookmarks, should not show load more
      expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument()
    })

    it('clicking load more shows more bookmarks', async () => {
      const user = userEvent.setup()
      const manyBookmarks = Array.from({ length: 15 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        is_tweet: false,
        is_categorized: true,
        domain: 'example.com',
        notes: null,
        og_image: null,
        add_date: null,
      }))

      render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

      const grid = screen.getByTestId('bookmark-grid')

      // Initially should show 12 bookmarks
      expect(within(grid).getAllByRole('article')).toHaveLength(12)

      // Click load more
      await user.click(screen.getByTestId('load-more-button'))

      // Should now show all 15 bookmarks
      expect(within(grid).getAllByRole('article')).toHaveLength(15)

      // Load more button should be gone
      expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument()
    })

    it('resets pagination when category filter changes', async () => {
      const user = userEvent.setup()
      const manyBookmarks = Array.from({ length: 15 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        is_tweet: false,
        is_categorized: true,
        domain: 'example.com',
        notes: null,
        og_image: null,
        add_date: null,
      }))

      // Link all bookmarks to UI category
      const manyBookmarkCategories = manyBookmarks.map(b => ({
        bookmark_id: b.id,
        category_id: '1',
      }))

      render(
        <BrowseContent
          categories={mockCategories}
          bookmarks={manyBookmarks}
          bookmarkCategories={manyBookmarkCategories}
        />
      )

      // Click load more to show all
      await user.click(screen.getByTestId('load-more-button'))

      const grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(15)

      // Click a category to filter
      const uiButton = screen.getByText('UI').closest('button')
      await user.click(uiButton!)

      // Should reset to initial 12 (or all 15 if fewer than 12 in category)
      // Since all 15 are in UI category, should show 12 again
      expect(within(grid).getAllByRole('article')).toHaveLength(12)
    })
  })

  // BRW-004: Search functionality tests
  describe('Search functionality', () => {
    it('renders search input', () => {
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('search input accepts text', async () => {
      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'react')

      expect(searchInput).toHaveValue('react')
    })

    it('fetches search results from API after debounce', async () => {
      const mockSearchResults = [
        { id: 'sr1', url: 'https://example.com/react', title: 'React Tutorial', is_tweet: false, is_categorized: true, domain: 'example.com', notes: null, og_image: null, add_date: null },
      ]
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockSearchResults, error: null }),
      })
      global.fetch = mockFetch

      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'react')

      // Wait for debounce and fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/search?q=react')
      }, { timeout: 500 })
    })

    it('shows search results when query is entered', async () => {
      const mockSearchResults = [
        { id: 'sr1', url: 'https://example.com/react', title: 'React Tutorial', is_tweet: false, is_categorized: true, domain: 'example.com', notes: null, og_image: null, add_date: null },
      ]
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockSearchResults, error: null }),
      })
      global.fetch = mockFetch

      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'react')

      // Wait for search results to be displayed
      await waitFor(() => {
        const grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getByText('LinkCard: React Tutorial')).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('clears search results when query is cleared', async () => {
      const mockSearchResults = [
        { id: 'sr1', url: 'https://example.com/react', title: 'React Tutorial', is_tweet: false, is_categorized: true, domain: 'example.com', notes: null, og_image: null, add_date: null },
      ]
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockSearchResults, error: null }),
      })
      global.fetch = mockFetch

      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      const searchInput = screen.getByPlaceholderText(/search/i)

      // Type a query
      await user.type(searchInput, 'react')

      // Wait for search results
      await waitFor(() => {
        const grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getByText('LinkCard: React Tutorial')).toBeInTheDocument()
      }, { timeout: 500 })

      // Clear the search input
      await user.clear(searchInput)

      // Should show all original bookmarks again
      await waitFor(() => {
        const grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(3)
      }, { timeout: 500 })
    })

    it('shows loading spinner while searching', async () => {
      let resolveJsonPromise: (value: { data: unknown[]; error: null }) => void
      const jsonPromise = new Promise<{ data: unknown[]; error: null }>(resolve => {
        resolveJsonPromise = resolve
      })
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => jsonPromise,
      })
      global.fetch = mockFetch

      const user = userEvent.setup()
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'react')

      // Should show loading indicator after debounce triggers fetch
      await waitFor(() => {
        expect(screen.getByTestId('search-loading')).toBeInTheDocument()
      }, { timeout: 500 })

      // Resolve the promise
      await act(async () => {
        resolveJsonPromise!({ data: [], error: null })
      })

      // Loading indicator should be gone
      await waitFor(() => {
        expect(screen.queryByTestId('search-loading')).not.toBeInTheDocument()
      })
    })

    it('resets pagination when search query changes', async () => {
      const manyBookmarks = Array.from({ length: 15 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        is_tweet: false,
        is_categorized: true,
        domain: 'example.com',
        notes: null,
        og_image: null,
        add_date: null,
      }))

      const user = userEvent.setup()
      render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

      // Click load more to show all
      await user.click(screen.getByTestId('load-more-button'))

      const grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(15)

      // Setup mock for search
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: manyBookmarks.slice(0, 5), error: null }),
      })
      global.fetch = mockFetch

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'test')

      // After search, should show search results (5 items) with reset pagination
      await waitFor(() => {
        expect(within(grid).getAllByRole('article')).toHaveLength(5)
      }, { timeout: 500 })
    })
  })
})
