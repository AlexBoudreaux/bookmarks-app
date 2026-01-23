import { render, screen } from '@testing-library/react'
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

import { BrowseContent } from './browse-content'

describe('BrowseContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sidebar with category tree', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    // Check sidebar exists
    expect(screen.getByRole('navigation')).toBeInTheDocument()

    // Check "All Bookmarks" option
    expect(screen.getByText('All Bookmarks')).toBeInTheDocument()
  })

  it('displays main categories in sidebar', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    expect(screen.getByText('UI')).toBeInTheDocument()
    expect(screen.getByText('AI Dev')).toBeInTheDocument()
  })

  it('renders search bar', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('renders bookmark grid placeholder', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    expect(screen.getByTestId('bookmark-grid')).toBeInTheDocument()
  })

  it('displays filter chips area', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    expect(screen.getByTestId('filter-area')).toBeInTheDocument()
  })

  it('shows bookmark count in sidebar for All Bookmarks', () => {
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    // Should show count of all bookmarks
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('sidebar can be collapsed', async () => {
    const user = userEvent.setup()
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    const toggleButton = screen.getByLabelText(/toggle sidebar/i)
    expect(toggleButton).toBeInTheDocument()

    await user.click(toggleButton)

    // After collapse, sidebar should be narrower (controlled by state)
    const sidebar = screen.getByRole('navigation')
    expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  })

  it('clicking category filters bookmarks', async () => {
    const user = userEvent.setup()
    render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    // Find the button that contains the UI text
    const uiText = screen.getByText('UI')
    const uiButton = uiText.closest('button')
    expect(uiButton).toBeDefined()

    await user.click(uiButton!)

    // The button should now have data-selected=true
    expect(uiButton).toHaveAttribute('data-selected', 'true')
  })

  it('has responsive grid layout', () => {
    const { container } = render(<BrowseContent categories={mockCategories} bookmarks={mockBookmarks} />)

    const grid = container.querySelector('[data-testid="bookmark-grid"]')
    expect(grid).toBeInTheDocument()
    // Grid should have responsive classes
    expect(grid?.className).toMatch(/grid/)
  })
})
