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
    it('is disabled - going back is not supported', async () => {
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

      // Press left arrow - should do nothing
      await user.keyboard('{ArrowLeft}')

      // Should still show first bookmark (going back is disabled)
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')
    })
  })

  describe('Progress tracking', () => {
    it('shows remaining count in display', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Should display position 1 of total (always starts at first bookmark)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // total count
    })

    it('updates count when bookmark is processed', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Should start with 3 bookmarks
      expect(screen.getByText('3')).toBeInTheDocument()

      // Select a category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Total should decrease to 2 (bookmark removed from queue)
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
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

    it('shows completion message when processing last bookmark', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
          initialIndex={0}
        />
      )

      // Select category and process
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
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
          initialIndex={0}
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

  describe('Notes field (N key)', () => {
    it('shows notes field when N key is pressed', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
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
          initialIndex={0}
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
          initialIndex={0}
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
          initialIndex={0}
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

    it('hides notes field when onClose is called', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Press N key to show notes
      await user.keyboard('n')
      await waitFor(() => {
        expect(screen.getByTestId('notes-field')).toBeInTheDocument()
      })

      // Click close button (simulates Escape in real component)
      await user.click(screen.getByTestId('close-notes'))

      // Notes field should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('notes-field')).not.toBeInTheDocument()
      })
    })

    it('shows notes hint in UI', () => {
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Should show N key hint
      expect(screen.getByText('N')).toBeInTheDocument()
      expect(screen.getByText(/notes/i)).toBeInTheDocument()
    })
  })

  describe('Queue management', () => {
    it('removes bookmark from queue after categorizing', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Should show first bookmark initially
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Select a category
      await user.click(screen.getByTestId('select-category'))

      // Press right arrow to categorize
      await user.keyboard('{ArrowRight}')

      // Should now show second bookmark (first one was removed from queue)
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })
    })

    it('removes bookmark from queue after skipping', async () => {
      const user = userEvent.setup()
      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={mockBookmarks}
          initialIndex={0}
        />
      )

      // Should show first bookmark initially
      expect(screen.getByTestId('tweet-preview')).toHaveTextContent('https://twitter.com/user/status/123')

      // Press Delete key to skip
      await user.keyboard('{Delete}')

      // Should now show second bookmark (first one was removed from queue)
      await waitFor(() => {
        expect(screen.getByTestId('link-card')).toHaveTextContent('GitHub Repo')
      })
    })

    it('shows completion when last bookmark is categorized', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
          initialIndex={0}
        />
      )

      // Select category and move forward
      await user.click(screen.getByTestId('select-category'))
      await user.keyboard('{ArrowRight}')

      // Should show completion message
      await waitFor(() => {
        expect(screen.getByText(/All bookmarks categorized/i)).toBeInTheDocument()
      })
    })

    it('shows completion when last bookmark is skipped', async () => {
      const user = userEvent.setup()
      const singleBookmark = [mockBookmarks[0]]

      render(
        <CategorizeWrapper
          categories={mockCategories}
          bookmarks={singleBookmark}
          initialIndex={0}
        />
      )

      // Press Delete to skip
      await user.keyboard('{Delete}')

      // Should show completion message
      await waitFor(() => {
        expect(screen.getByText(/All bookmarks categorized/i)).toBeInTheDocument()
      })
    })
  })
})
