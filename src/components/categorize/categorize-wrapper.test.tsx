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

// Mock NotesField
vi.mock('./notes-field', () => ({
  NotesField: ({
    bookmarkId,
    initialNotes,
    isVisible,
    onClose,
  }: {
    bookmarkId: string
    initialNotes: string | null
    isVisible: boolean
    onClose: () => void
  }) => (
    isVisible ? (
      <div data-testid="notes-field" data-bookmark-id={bookmarkId}>
        <span data-testid="notes-content">{initialNotes ?? ''}</span>
        <button data-testid="close-notes" onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

describe('CategorizeWrapper - Position-based Navigation', () => {
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

    it('clears selected categories after navigating forward to unprocessed bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
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

  describe('Left Arrow Key (←) - Going Back', () => {
    it('moves to previous bookmark when pressing left arrow', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // First bookmark should be shown
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Select category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show second bookmark
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })

      // Press left arrow to go back
      await user.keyboard('{ArrowLeft}')

      // Should show first bookmark again
      await waitFor(() => {
        expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
      })
    })

    it('does nothing when at start and pressing left arrow', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // First bookmark should be shown
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Press left arrow - should do nothing at start
      await user.keyboard('{ArrowLeft}')

      // Should still show first bookmark
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
    })

    it('restores selected categories when navigating back to processed bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Select category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Navigate to second, then back
      await user.keyboard('{ArrowLeft}')

      // Categories should be restored
      await waitFor(() => {
        expect(screen.getByTestId('selected-pairs')).toHaveTextContent('UI')
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
        />
      )

      // Press right arrow without selecting category
      await user.keyboard('{ArrowRight}')

      // Should NOT call categorize API
      expect(mockFetch).not.toHaveBeenCalledWith('/api/bookmarks/categorize', expect.anything())
    })

    it('shows error message when API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) })
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Select a category
      await user.click(screen.getByTestId('select-category'))

      // Press right arrow
      await user.keyboard('{ArrowRight}')

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      // Should NOT advance to next bookmark
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
    })

    it('does not call API when re-visiting already processed bookmark with same categories', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Select category and move forward (first API call)
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Go back
      await user.keyboard('{ArrowLeft}')

      // Categories are pre-populated, press right without changing anything
      await user.keyboard('{ArrowRight}')

      // Should NOT make another API call (no-op detection)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Progress tracking', () => {
    it('shows position in total count', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Should display position 1 of 3
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('updates position when navigating forward', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Select a category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show position 2 of 3
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('shows session stats (categorized and skipped counts)', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Select category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show categorized count
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText(/categorized/)).toBeInTheDocument()
      })
    })

    it('shows "Previously categorized" indicator when viewing categorized bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Select category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Go back to categorized bookmark
      await user.keyboard('{ArrowLeft}')

      // Should show "Previously categorized" indicator
      await waitFor(() => {
        expect(screen.getByText(/previously categorized/i)).toBeInTheDocument()
      })
    })

    it('shows "Previously skipped" indicator when viewing skipped bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Skip the first bookmark
      await user.keyboard('{Delete}')

      // Go back to skipped bookmark
      await user.keyboard('{ArrowLeft}')

      // Should show "Previously skipped" indicator
      await waitFor(() => {
        expect(screen.getByText(/previously skipped/i)).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('shows empty message when no bookmarks', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={[]}
        />
      )

      expect(screen.getByText(/no bookmarks to categorize/i)).toBeInTheDocument()
    })
  })

  describe('End of list', () => {
    it('shows end of list when navigating past last bookmark', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
        />
      )

      // Select category and process
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show end of list state
      await waitFor(() => {
        expect(screen.getByText(/end of list/i)).toBeInTheDocument()
      })
    })

    it('shows session stats in end of list screen', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
        />
      )

      // Select category and process
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show session stats
      await waitFor(() => {
        expect(screen.getByText(/1 categorized/)).toBeInTheDocument()
        expect(screen.getByText(/0 skipped/)).toBeInTheDocument()
      })
    })

    it('allows going back from end of list screen', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
        />
      )

      // Select category and process
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should be at end of list
      await waitFor(() => {
        expect(screen.getByText(/end of list/i)).toBeInTheDocument()
      })

      // Press left arrow or click go back button
      await user.keyboard('{ArrowLeft}')

      // Should go back to last bookmark
      await waitFor(() => {
        expect(screen.getByTestId('tweet-preview')).toBeInTheDocument()
      })
    })

    it('shows Browse and Export links in end of list screen', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
        />
      )

      // Select category and process
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show Browse and Export links
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /browse/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /export/i })).toBeInTheDocument()
      })
    })
  })

  describe('Skip bookmark (Delete/Backspace)', () => {
    it('skips bookmark and advances when Delete is pressed', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // First bookmark should be shown
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should show second bookmark
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })
    })

    it('calls skip API when Delete is pressed', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookmarkId: 'b1' }),
        })
      })
    })

    it('skips bookmark when Backspace is pressed', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press Backspace key
      await user.keyboard('{Backspace}')

      // Should advance to second bookmark
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })
    })

    it('shows red flash animation when skipping', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should show red flash
      await waitFor(() => {
        expect(screen.getByTestId('skip-flash')).toBeInTheDocument()
      })
    })

    it('increments skipped count in session stats', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should show skipped count of 1
      await waitFor(() => {
        expect(screen.getByText(/1/)).toBeInTheDocument()
        expect(screen.getByText(/skipped/)).toBeInTheDocument()
      })
    })

    it('shows error when skip API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) })
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press Delete key
      await user.keyboard('{Delete}')

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      // Should NOT advance
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
    })
  })

  describe('Notes field (N key)', () => {
    it('shows notes field when N key is pressed', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Notes field should not be visible initially
      expect(screen.queryByTestId('notes-field')).not.toBeInTheDocument()

      // Press N key
      await user.keyboard('n')

      // Notes field should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('notes-field')).toBeInTheDocument()
      })
    })

    it('hides notes field when N key is pressed again', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press N key to show
      await user.keyboard('n')
      await waitFor(() => {
        expect(screen.getByTestId('notes-field')).toBeInTheDocument()
      })

      // Press N key again to hide
      await user.keyboard('n')
      await waitFor(() => {
        expect(screen.queryByTestId('notes-field')).not.toBeInTheDocument()
      })
    })

    it('passes correct bookmark id to notes field', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press N key
      await user.keyboard('n')

      // Notes field should have correct bookmark id
      await waitFor(() => {
        expect(screen.getByTestId('notes-field')).toHaveAttribute('data-bookmark-id', 'b1')
      })
    })

    it('hides notes field when navigating to next bookmark', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Press N key to show notes
      await user.keyboard('n')
      await waitFor(() => {
        expect(screen.getByTestId('notes-field')).toBeInTheDocument()
      })

      // Select category and navigate
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Notes field should be hidden for new bookmark
      await waitFor(() => {
        expect(screen.queryByTestId('notes-field')).not.toBeInTheDocument()
      })
    })

    it('shows notes hint in UI', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
        />
      )

      // Should show N key hint
      expect(screen.getByText('N')).toBeInTheDocument()
      expect(screen.getByText(/notes/i)).toBeInTheDocument()
    })
  })
})
