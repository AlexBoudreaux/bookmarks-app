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
  { id: '1', name: 'UI', parentId: null, usageCount: 100, sortOrder: 0, createdAt: '2024-01-01' },
  { id: '2', name: 'AI Dev', parentId: null, usageCount: 90, sortOrder: 1, createdAt: '2024-01-01' },
  { id: '1a', name: 'Components', parentId: '1', usageCount: 50, sortOrder: 0, createdAt: '2024-01-01' },
  { id: '1b', name: 'Landing Pages', parentId: '1', usageCount: 30, sortOrder: 1, createdAt: '2024-01-01' },
  { id: '2a', name: 'Agents', parentId: '2', usageCount: 40, sortOrder: 0, createdAt: '2024-01-01' },
]

const mockBookmarks = [
  { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', isTweet: true, isCategorized: true, domain: 'twitter.com', notes: null, ogImage: null, addDate: null },
  { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', isTweet: false, isCategorized: true, domain: 'github.com', notes: null, ogImage: null, addDate: null },
  { id: '3', url: 'https://example.com/article', title: 'Example Article', isTweet: false, isCategorized: true, domain: 'example.com', notes: null, ogImage: null, addDate: null },
]

// Junction table data linking bookmarks to categories
const mockBookmarkCategories = [
  { bookmarkId: '1', categoryId: '1a' }, // Test Tweet -> UI/Components
  { bookmarkId: '1', categoryId: '1' },  // Test Tweet -> UI (main)
  { bookmarkId: '2', categoryId: '2a' }, // GitHub Repo -> AI Dev/Agents
  { bookmarkId: '2', categoryId: '2' },  // GitHub Repo -> AI Dev (main)
  { bookmarkId: '3', categoryId: '1b' }, // Example Article -> UI/Landing Pages
  { bookmarkId: '3', categoryId: '1' },  // Example Article -> UI (main)
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

  it('has responsive masonry layout', () => {
    const { container } = render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

    const grid = container.querySelector('[data-testid="bookmark-grid"]')
    expect(grid).toBeInTheDocument()
    // Should have responsive columns for masonry layout
    expect(grid?.className).toMatch(/columns/)
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

    it('shows loading spinner when there are more bookmarks', () => {
      // Create 30 bookmarks (more than ITEMS_PER_PAGE of 24)
      const manyBookmarks = Array.from({ length: 30 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        isTweet: false,
        isCategorized: true,
        domain: 'example.com',
        notes: null,
        ogImage: null,
        addDate: null,
      }))

      render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

      // Should show loading spinner for infinite scroll
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('does not show loading spinner when all bookmarks displayed', () => {
      render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} bookmarkCategories={mockBookmarkCategories} />)

      // Only 3 bookmarks, should not show loading spinner
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    })

    it('initially shows paginated bookmarks', () => {
      const manyBookmarks = Array.from({ length: 30 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        isTweet: false,
        isCategorized: true,
        domain: 'example.com',
        notes: null,
        ogImage: null,
        addDate: null,
      }))

      render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

      const grid = screen.getByTestId('bookmark-grid')

      // Initially should show 24 bookmarks (ITEMS_PER_PAGE)
      expect(within(grid).getAllByRole('article')).toHaveLength(24)
    })

    it('resets pagination when category filter changes', async () => {
      const user = userEvent.setup()
      const manyBookmarks = Array.from({ length: 30 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        isTweet: false,
        isCategorized: true,
        domain: 'example.com',
        notes: null,
        ogImage: null,
        addDate: null,
      }))

      // Link all bookmarks to UI category
      const manyBookmarkCategories = manyBookmarks.map(b => ({
        bookmarkId: b.id,
        categoryId: '1',
      }))

      render(
        <BrowseContent
          categories={mockCategories}
          bookmarks={manyBookmarks}
          bookmarkCategories={manyBookmarkCategories}
        />
      )

      const grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(24)

      // Click a category to filter
      const uiButton = screen.getByText('UI').closest('button')
      await user.click(uiButton!)

      // Should reset to initial 24 (or all 30 if fewer than 24 in category)
      // Since all 30 are in UI category, should show 24 again
      expect(within(grid).getAllByRole('article')).toHaveLength(24)
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
        { id: 'sr1', url: 'https://example.com/react', title: 'React Tutorial', isTweet: false, isCategorized: true, domain: 'example.com', notes: null, ogImage: null, addDate: null },
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
        { id: 'sr1', url: 'https://example.com/react', title: 'React Tutorial', isTweet: false, isCategorized: true, domain: 'example.com', notes: null, ogImage: null, addDate: null },
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
        { id: 'sr1', url: 'https://example.com/react', title: 'React Tutorial', isTweet: false, isCategorized: true, domain: 'example.com', notes: null, ogImage: null, addDate: null },
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
      const manyBookmarks = Array.from({ length: 10 }, (_, i) => ({
        id: `bm-${i}`,
        url: `https://example.com/${i}`,
        title: `Bookmark ${i}`,
        isTweet: false,
        isCategorized: true,
        domain: 'example.com',
        notes: null,
        ogImage: null,
        addDate: null,
      }))

      const user = userEvent.setup()
      render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

      const grid = screen.getByTestId('bookmark-grid')
      expect(within(grid).getAllByRole('article')).toHaveLength(10)

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

  // BRW-005: Filter chips and dropdowns tests
  describe('Filter chips and dropdowns', () => {
    // Extended mock data for filter testing
    const filterTestBookmarks = [
      { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', isTweet: true, isCategorized: true, domain: 'twitter.com', notes: 'Some notes here', ogImage: null, addDate: '2024-01-15T00:00:00Z' },
      { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', isTweet: false, isCategorized: true, domain: 'github.com', notes: null, ogImage: null, addDate: '2024-01-10T00:00:00Z' },
      { id: '3', url: 'https://example.com/article', title: 'Example Article', isTweet: false, isCategorized: true, domain: 'example.com', notes: 'Important article', ogImage: null, addDate: '2024-01-20T00:00:00Z' },
      { id: '4', url: 'https://twitter.com/other/status/456', title: 'Another Tweet', isTweet: true, isCategorized: true, domain: 'twitter.com', notes: null, ogImage: null, addDate: '2024-01-05T00:00:00Z' },
    ]

    describe('Sort dropdown', () => {
      it('renders sort dropdown with default "Newest" option', () => {
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument()
        expect(screen.getByText(/newest/i)).toBeInTheDocument()
      })

      it('clicking sort dropdown shows options: Newest, Oldest, Recently viewed', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const sortButton = screen.getByRole('button', { name: /sort/i })
        await user.click(sortButton)

        expect(screen.getByRole('option', { name: /newest/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /oldest/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /recently viewed/i })).toBeInTheDocument()
      })

      it('selecting "Oldest" sorts bookmarks by oldest first', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const sortButton = screen.getByRole('button', { name: /sort/i })
        await user.click(sortButton)

        const oldestOption = screen.getByRole('option', { name: /oldest/i })
        await user.click(oldestOption)

        // First bookmark should now be "Another Tweet" (oldest date)
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles[0]).toHaveTextContent('Another Tweet')
      })

      it('selecting "Newest" sorts bookmarks by newest first', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        // First bookmark should be "Example Article" (newest date: 2024-01-20)
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles[0]).toHaveTextContent('Example Article')
      })
    })

    describe('Type toggle', () => {
      it('renders type filter with default "All" option', () => {
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        expect(screen.getByRole('button', { name: /type/i })).toBeInTheDocument()
      })

      it('clicking type toggle shows options: All, Tweet, Non-tweet', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)

        expect(screen.getByRole('option', { name: /^all$/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /^tweet$/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /^non-tweet$/i })).toBeInTheDocument()
      })

      it('selecting "Tweet" filters to only tweet bookmarks', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)

        const tweetOption = screen.getByRole('option', { name: /^tweet$/i })
        await user.click(tweetOption)

        // Should only show tweet bookmarks
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles).toHaveLength(2)
        expect(within(grid).getByText('TweetCard: Test Tweet')).toBeInTheDocument()
        expect(within(grid).getByText('TweetCard: Another Tweet')).toBeInTheDocument()
      })

      it('selecting "Non-tweet" filters to only non-tweet bookmarks', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)

        const nonTweetOption = screen.getByRole('option', { name: /non-tweet/i })
        await user.click(nonTweetOption)

        // Should only show non-tweet bookmarks
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles).toHaveLength(2)
        expect(within(grid).getByText('LinkCard: GitHub Repo')).toBeInTheDocument()
        expect(within(grid).getByText('LinkCard: Example Article')).toBeInTheDocument()
      })
    })

    describe('Domain multi-select', () => {
      it('renders domain filter button', () => {
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        expect(screen.getByRole('button', { name: /domain/i })).toBeInTheDocument()
      })

      it('clicking domain filter shows unique domains from bookmarks', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const domainButton = screen.getByRole('button', { name: /domain/i })
        await user.click(domainButton)

        expect(screen.getByRole('option', { name: /twitter\.com/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /github\.com/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /example\.com/i })).toBeInTheDocument()
      })

      it('selecting a domain filters to only bookmarks from that domain', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const domainButton = screen.getByRole('button', { name: /domain/i })
        await user.click(domainButton)

        const twitterOption = screen.getByRole('option', { name: /twitter\.com/i })
        await user.click(twitterOption)

        // Should only show twitter.com bookmarks
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles).toHaveLength(2)
      })

      it('can select multiple domains', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const domainButton = screen.getByRole('button', { name: /domain/i })
        await user.click(domainButton)

        // Select twitter.com (dropdown stays open for multi-select)
        const twitterOption = screen.getByRole('option', { name: /twitter\.com/i })
        await user.click(twitterOption)

        // Select github.com too (dropdown should still be open)
        const githubOption = screen.getByRole('option', { name: /github\.com/i })
        await user.click(githubOption)

        // Close dropdown by clicking button again
        await user.click(domainButton)

        // Should show twitter.com and github.com bookmarks (3 total)
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles).toHaveLength(3)
      })
    })

    describe('Has notes toggle', () => {
      it('renders has notes toggle button', () => {
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        expect(screen.getByRole('button', { name: /has notes/i })).toBeInTheDocument()
      })

      it('clicking has notes toggle filters to only bookmarks with notes', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const hasNotesButton = screen.getByRole('button', { name: /has notes/i })
        await user.click(hasNotesButton)

        // Should only show bookmarks with notes (Test Tweet and Example Article)
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles).toHaveLength(2)
        expect(within(grid).getByText('TweetCard: Test Tweet')).toBeInTheDocument()
        expect(within(grid).getByText('LinkCard: Example Article')).toBeInTheDocument()
      })

      it('clicking has notes toggle again removes the filter', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const hasNotesButton = screen.getByRole('button', { name: /has notes/i })

        // Enable filter
        await user.click(hasNotesButton)

        let grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(2)

        // Disable filter
        await user.click(hasNotesButton)

        grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(4)
      })
    })

    describe('Active filter chips', () => {
      it('shows active filter chip when type filter is applied', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)

        const tweetOption = screen.getByRole('option', { name: /^tweet$/i })
        await user.click(tweetOption)

        // Should show active filter chip
        expect(screen.getByTestId('active-filter-chip')).toBeInTheDocument()
        expect(screen.getByTestId('active-filter-chip')).toHaveTextContent(/tweet/i)
      })

      it('shows active filter chip when domain filter is applied', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const domainButton = screen.getByRole('button', { name: /domain/i })
        await user.click(domainButton)

        const twitterOption = screen.getByRole('option', { name: /twitter\.com/i })
        await user.click(twitterOption)

        expect(screen.getByTestId('active-filter-chip')).toBeInTheDocument()
        expect(screen.getByTestId('active-filter-chip')).toHaveTextContent(/twitter\.com/i)
      })

      it('shows active filter chip when has notes filter is enabled', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        const hasNotesButton = screen.getByRole('button', { name: /has notes/i })
        await user.click(hasNotesButton)

        expect(screen.getByTestId('active-filter-chip')).toBeInTheDocument()
        expect(screen.getByTestId('active-filter-chip')).toHaveTextContent(/has notes/i)
      })

      it('clicking X on active filter chip removes that filter', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        // Apply has notes filter
        const hasNotesButton = screen.getByRole('button', { name: /has notes/i })
        await user.click(hasNotesButton)

        let grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(2)

        // Click the X on the active filter chip
        const removeButton = screen.getByTestId('remove-filter-button')
        await user.click(removeButton)

        // Filter should be removed
        grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(4)
        expect(screen.queryByTestId('active-filter-chip')).not.toBeInTheDocument()
      })

      it('shows multiple active filter chips when multiple filters applied', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        // Apply type filter
        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)
        const tweetOption = screen.getByRole('option', { name: /^tweet$/i })
        await user.click(tweetOption)

        // Apply has notes filter
        const hasNotesButton = screen.getByRole('button', { name: /has notes/i })
        await user.click(hasNotesButton)

        // Should show 2 active filter chips
        const chips = screen.getAllByTestId('active-filter-chip')
        expect(chips).toHaveLength(2)
      })
    })

    describe('Filter combinations', () => {
      it('type and has notes filters work together', async () => {
        const user = userEvent.setup()
        render(<BrowseContent categories={[]} bookmarks={filterTestBookmarks} bookmarkCategories={[]} />)

        // Apply tweet type filter
        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)
        const tweetOption = screen.getByRole('option', { name: /^tweet$/i })
        await user.click(tweetOption)

        // Apply has notes filter
        const hasNotesButton = screen.getByRole('button', { name: /has notes/i })
        await user.click(hasNotesButton)

        // Should only show tweets with notes (just Test Tweet)
        const grid = screen.getByTestId('bookmark-grid')
        const articles = within(grid).getAllByRole('article')
        expect(articles).toHaveLength(1)
        expect(within(grid).getByText('TweetCard: Test Tweet')).toBeInTheDocument()
      })

      it('filters reset pagination', async () => {
        const user = userEvent.setup()
        const manyBookmarks = Array.from({ length: 20 }, (_, i) => ({
          id: `bm-${i}`,
          url: `https://twitter.com/test/status/${i}`,
          title: `Bookmark ${i}`,
          isTweet: i < 10, // First 10 are tweets
          isCategorized: true,
          domain: 'twitter.com',
          notes: i < 5 ? 'Has notes' : null, // First 5 have notes
          ogImage: null,
          addDate: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        }))

        render(<BrowseContent categories={[]} bookmarks={manyBookmarks} bookmarkCategories={[]} />)

        // All 20 bookmarks should be visible (under ITEMS_PER_PAGE of 24)
        let grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(20)

        // Apply type filter
        const typeButton = screen.getByRole('button', { name: /type/i })
        await user.click(typeButton)
        const tweetOption = screen.getByRole('option', { name: /^tweet$/i })
        await user.click(tweetOption)

        // Should show only tweets with pagination reset
        grid = screen.getByTestId('bookmark-grid')
        expect(within(grid).getAllByRole('article')).toHaveLength(10)
      })
    })
  })
})
