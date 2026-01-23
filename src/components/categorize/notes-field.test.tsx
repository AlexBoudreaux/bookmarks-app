import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotesField } from './notes-field'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NotesField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Visibility', () => {
    it('shows textarea when isVisible is true', () => {
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('does not render when isVisible is false', () => {
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={false}
          onClose={() => {}}
        />
      )

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('shows placeholder text when empty', () => {
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={true}
          onClose={() => {}}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('placeholder', 'Add personal notes about this bookmark...')
    })
  })

  describe('Initial content', () => {
    it('displays existing notes', () => {
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes="Existing note content"
          isVisible={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('textbox')).toHaveValue('Existing note content')
    })

    it('handles null initial notes', () => {
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes={null}
          isVisible={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('textbox')).toHaveValue('')
    })
  })

  describe('Auto-save on blur', () => {
    it('saves notes when textarea loses focus', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(
        <div>
          <NotesField
            bookmarkId="test-bookmark-id"
            initialNotes=""
            isVisible={true}
            onClose={() => {}}
          />
          <button>Other element</button>
        </div>
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'New note content')
      await user.click(screen.getByRole('button', { name: /other/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookmarkId: 'test-bookmark-id',
            notes: 'New note content',
          }),
        })
      })
    })

    it('does not save if notes unchanged', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(
        <div>
          <NotesField
            bookmarkId="test-bookmark-id"
            initialNotes="Existing content"
            isVisible={true}
            onClose={() => {}}
          />
          <button>Other element</button>
        </div>
      )

      const textarea = screen.getByRole('textbox')
      await user.click(textarea)
      await user.click(screen.getByRole('button', { name: /other/i }))

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Escape key', () => {
    it('calls onClose when Escape is pressed', async () => {
      vi.useRealTimers()
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={true}
          onClose={onClose}
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.click(textarea)
      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalled()
    })

    it('saves notes before closing on Escape', async () => {
      vi.useRealTimers()
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(
        <NotesField
          bookmarkId="test-bookmark-id"
          initialNotes=""
          isVisible={true}
          onClose={onClose}
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Quick note')
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/notes', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            bookmarkId: 'test-bookmark-id',
            notes: 'Quick note',
          }),
        }))
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Focus behavior', () => {
    it('focuses textarea when becoming visible', () => {
      const { rerender } = render(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={false}
          onClose={() => {}}
        />
      )

      rerender(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('textbox')).toHaveFocus()
    })
  })

  describe('Keyboard hint', () => {
    it('shows Escape key hint', () => {
      render(
        <NotesField
          bookmarkId="test-id"
          initialNotes=""
          isVisible={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/esc/i)).toBeInTheDocument()
    })
  })
})
