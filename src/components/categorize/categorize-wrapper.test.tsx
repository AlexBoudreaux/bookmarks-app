import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorizeWrapper } from './categorize-wrapper'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock CategoryPicker to expose selected pairs state
vi.mock('./category-picker', () => ({
  CategoryPicker: ({
    categories,
    onSelect,
    selectedPairs = [],
    onSelectedPairsChange,
    isShaking
  }: {
    categories: any[]
    onSelect: (cat: any) => void
    selectedPairs?: any[]
    onSelectedPairsChange?: (pairs: any[]) => void
    isShaking?: boolean
  }) => (
    <div data-testid="category-picker" data-is-shaking={isShaking}>
      <div data-testid="selected-pairs">{JSON.stringify(selectedPairs)}</div>
      <button
        data-testid="select-category"
        onClick={() => {
          const newPairs = [
            ...selectedPairs,
            { main: { id: '1', name: 'UI' }, sub: { id: '1a', name: 'Components' } }
          ]
          onSelectedPairsChange?.(newPairs)
        }}
      >
        Select Category
      </button>
      <button
        data-testid="clear-categories"
        onClick={() => onSelectedPairsChange?.([])}
      >
        Clear
      </button>
    </div>
  ),
}))

// Mock TweetPreview
vi.mock('./tweet-preview', () => ({
  TweetPreview: ({ url }: { url: string }) => <div data-testid="tweet-preview">{url}</div>,
}))

// Mock LinkCard
vi.mock('./link-card', () => ({
  LinkCard: ({ title, url }: { title: string; url: string }) => (
    <div data-testid="link-card">{title} - {url}</div>
  ),
}))

describe('CategorizeWrapper - Navigation', () => {
  const mockCategories = [
    { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
    { id: '1a', name: 'Components', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
    { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
    { id: '2a', name: 'Prompts', parent_id: '2', usage_count: 45, sort_order: 0, created_at: '2024-01-01' },
  ]

  const mockBookmarks = [
    {
      id: 'b1',
      url: 'https://twitter.com/user/status/123',
      title: 'Tweet 1',
      is_tweet: true,
      is_categorized: false,
      is_keeper: false,
      is_skipped: false,
      domain: 'twitter.com',
      add_date: '2024-01-01'
    },
    {
      id: 'b2',
      url: 'https://github.com/example/repo',
      title: 'GitHub Repo',
      is_tweet: false,
      is_categorized: false,
      is_keeper: false,
      is_skipped: false,
      domain: 'github.com',
      add_date: '2024-01-02'
    },
    {
      id: 'b3',
      url: 'https://twitter.com/other/status/456',
      title: 'Tweet 2',
      is_tweet: true,
      is_categorized: false,
      is_keeper: false,
      is_skipped: false,
      domain: 'twitter.com',
      add_date: '2024-01-03'
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
  })

  describe('Right Arrow Key (→)', () => {
    it('moves to next bookmark when category is selected', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // First bookmark should be shown
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Select a category
      await user.click(screen.getByTestId('select-category'))

      // Press right arrow
      await user.keyboard('{ArrowRight}')

      // Should now show second bookmark (LinkCard for GitHub)
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })
    })

    it('shakes category picker when no category selected', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Press right arrow without selecting category
      await user.keyboard('{ArrowRight}')

      // Category picker should be shaking
      await waitFor(() => {
        expect(screen.getByTestId('category-picker')).toHaveAttribute('data-is-shaking', 'true')
      })

      // Should NOT move to next bookmark
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
    })

    it('clears selected categories after navigating forward', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Select a category
      await user.click(screen.getByTestId('select-category'))
      expect(screen.getByTestId('selected-pairs')).toHaveTextContent('UI')

      // Press right arrow
      await user.keyboard('{ArrowRight}')

      // Selected pairs should be cleared for new bookmark
      await waitFor(() => {
        expect(screen.getByTestId('selected-pairs')).toHaveTextContent('[]')
      })
    })
  })

  describe('Save categorization to API', () => {
    it('calls categorize API when moving to next bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Select a category
      await user.click(screen.getByTestId('select-category'))

      // Press right arrow
      await user.keyboard('{ArrowRight}')

      // Should call categorize API with bookmark id and category ids
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookmarkId: 'b1',
            categoryIds: ['1', '1a'], // main and sub from the pair
          }),
        })
      })
    })

    it('does not call categorize API when shaking (no category selected)', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Press right arrow without selecting category
      await user.keyboard('{ArrowRight}')

      // Should NOT call categorize API
      expect(mockFetch).not.toHaveBeenCalledWith('/api/bookmarks/categorize', expect.anything())
    })
  })

  describe('Left Arrow Key (←)', () => {
    it('moves to previous bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={1}
        />
      )

      // Second bookmark (GitHub) should be shown
      expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')

      // Press left arrow
      await user.keyboard('{ArrowLeft}')

      // Should now show first bookmark (Tweet)
      await waitFor(() => {
        expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
      })
    })

    it('does nothing at first bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // First bookmark should be shown
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Press left arrow
      await user.keyboard('{ArrowLeft}')

      // Should still show first bookmark
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
    })

    it('clears selected categories when going back', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={1}
        />
      )

      // Select a category
      await user.click(screen.getByTestId('select-category'))
      expect(screen.getByTestId('selected-pairs')).toHaveTextContent('UI')

      // Press left arrow
      await user.keyboard('{ArrowLeft}')

      // Selected pairs should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('selected-pairs')).toHaveTextContent('[]')
      })
    })
  })

  describe('Progress tracking', () => {
    it('shows current index in display', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={1}
        />
      )

      // Should display current position (1-indexed for user display)
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // total count
    })

    it('calls onIndexChange when navigating', async () => {
      const user = userEvent.setup()
      const onIndexChange = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
          onIndexChange={onIndexChange}
        />
      )

      // Select a category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      await waitFor(() => {
        expect(onIndexChange).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('Empty state', () => {
    it('shows completion message when no bookmarks', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={[]}
          initialIndex={0}
        />
      )

      expect(screen.getByText(/no bookmarks to categorize/i)).toBeInTheDocument()
    })

    it('shows completion message at end of list', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={2} // Last bookmark
        />
      )

      // Select category and try to go forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show completion state
      await waitFor(() => {
        expect(screen.getByText(/all bookmarks categorized/i)).toBeInTheDocument()
      })
    })
  })

  describe('Skip bookmark (Delete/Backspace)', () => {
    it('calls onSkip with current bookmark when Delete is pressed', async () => {
      const user = userEvent.setup()
      const onSkip = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
          onSkip={onSkip}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      await waitFor(() => {
        expect(onSkip).toHaveBeenCalledWith(mockBookmarks[0])
      })
    })

    it('calls onSkip with current bookmark when Backspace is pressed', async () => {
      const user = userEvent.setup()
      const onSkip = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
          onSkip={onSkip}
        />
      )

      // Press Backspace key
      await user.keyboard('{Backspace}')

      await waitFor(() => {
        expect(onSkip).toHaveBeenCalledWith(mockBookmarks[0])
      })
    })

    it('moves to next bookmark after skipping', async () => {
      const user = userEvent.setup()
      const onSkip = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
          onSkip={onSkip}
        />
      )

      // First bookmark should be shown
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should move to second bookmark
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })
    })

    it('shows red flash animation when skipping', async () => {
      const user = userEvent.setup()
      const onSkip = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
          onSkip={onSkip}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should show red flash
      await waitFor(() => {
        expect(screen.getByTestId('skip-flash')).toBeInTheDocument()
      })
    })

    it('clears selected categories when skipping', async () => {
      const user = userEvent.setup()
      const onSkip = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
          onSkip={onSkip}
        />
      )

      // Select a category first
      await user.click(screen.getByTestId('select-category'))
      expect(screen.getByTestId('selected-pairs')).toHaveTextContent('UI')

      // Press Delete key
      await user.keyboard('{Delete}')

      // Selected pairs should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('selected-pairs')).toHaveTextContent('[]')
      })
    })

    it('shows completion state when skipping last bookmark', async () => {
      const user = userEvent.setup()
      const onSkip = vi.fn()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={2} // Last bookmark
          onSkip={onSkip}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should show completion state
      await waitFor(() => {
        expect(screen.getByText(/all bookmarks categorized/i)).toBeInTheDocument()
      })
    })
  })
})
