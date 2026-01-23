import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Sample test data
const mockCategories = [
  { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
  { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
  { id: '1a', name: 'Components', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
  { id: '1b', name: 'Landing Pages', parent_id: '1', usage_count: 30, sort_order: 1, created_at: '2024-01-01' },
  { id: '2a', name: 'Agents', parent_id: '2', usage_count: 40, sort_order: 0, created_at: '2024-01-01' },
]

const mockBookmarks = [
  { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', is_tweet: true, is_categorized: true, domain: 'twitter.com' },
  { id: '2', url: 'https://github.com/example/repo', title: 'GitHub Repo', is_tweet: false, is_categorized: true, domain: 'github.com' },
  { id: '3', url: 'https://example.com/article', title: 'Example Article', is_tweet: false, is_categorized: true, domain: 'example.com' },
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
      expect(within(grid).getByText('Test Tweet')).toBeInTheDocument()
      expect(within(grid).getByText('Example Article')).toBeInTheDocument()
      expect(within(grid).queryByText('GitHub Repo')).not.toBeInTheDocument()
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
      expect(within(grid).getByText('Test Tweet')).toBeInTheDocument()
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
})
