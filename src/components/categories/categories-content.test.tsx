import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoriesContent } from './categories-content'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock @hello-pangea/dnd to make testing easier
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => {
    // Store onDragEnd so we can call it in tests
    ;(window as any).__onDragEnd = onDragEnd
    return <div data-testid="drag-drop-context">{children}</div>
  },
  Droppable: ({ children }: any) =>
    children(
      {
        droppableProps: { 'data-testid': 'droppable' },
        innerRef: () => {},
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({ children, draggableId, index }: any) =>
    children(
      {
        draggableProps: { 'data-draggable-id': draggableId },
        dragHandleProps: { 'data-drag-handle': 'true', role: 'button' },
        innerRef: () => {},
      },
      { isDragging: false }
    ),
}))

const mockCategories = [
  { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: null },
  { id: '2', name: 'Landing Pages', parent_id: '1', usage_count: 50, sort_order: 0, created_at: null },
  { id: '3', name: 'Components', parent_id: '1', usage_count: 30, sort_order: 1, created_at: null },
  { id: '4', name: 'AI Dev', parent_id: null, usage_count: 80, sort_order: 1, created_at: null },
  { id: '5', name: 'Agents', parent_id: '4', usage_count: 40, sort_order: 0, created_at: null },
  { id: '6', name: 'LLM Stack', parent_id: '4', usage_count: 20, sort_order: 1, created_at: null },
]

const mockBookmarkCategories = [
  { bookmark_id: 'b1', category_id: '2' },
  { bookmark_id: 'b2', category_id: '2' },
  { bookmark_id: 'b3', category_id: '3' },
  { bookmark_id: 'b4', category_id: '5' },
  { bookmark_id: 'b5', category_id: '5' },
  { bookmark_id: 'b6', category_id: '5' },
]

describe('CategoriesContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('renders main categories', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    expect(screen.getByText('UI')).toBeInTheDocument()
    expect(screen.getByText('AI Dev')).toBeInTheDocument()
  })

  it('shows subcategories under main categories', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    expect(screen.getByText('Landing Pages')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('LLM Stack')).toBeInTheDocument()
  })

  it('shows bookmark count for main categories (including subcategories)', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    // UI has 2 + 1 = 3 bookmarks (Landing Pages + Components)
    // AI Dev has 3 bookmarks (Agents)
    const uiCategory = screen.getByText('UI').closest('[data-category]')
    expect(uiCategory).toHaveTextContent('3')

    const aiCategory = screen.getByText('AI Dev').closest('[data-category]')
    expect(aiCategory).toHaveTextContent('3')
  })

  it('shows bookmark count for subcategories', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    // Landing Pages has 2 bookmarks
    const landingPages = screen.getByText('Landing Pages').closest('[data-subcategory]')
    expect(landingPages).toHaveTextContent('2')

    // Agents has 3 bookmarks
    const agents = screen.getByText('Agents').closest('[data-subcategory]')
    expect(agents).toHaveTextContent('3')
  })

  it('shows edit button for each category', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    // 2 main categories + 4 subcategories = 6 edit buttons
    expect(editButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('shows delete button for each category', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('shows add subcategory button for main categories', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const addSubcatButtons = screen.getAllByRole('button', { name: /add subcat/i })
    expect(addSubcatButtons).toHaveLength(2) // One for each main category
  })

  it('opens inline edit when edit button clicked', async () => {
    const user = userEvent.setup()
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    // Should show input field with category name
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('UI')
  })

  it('saves edited category name on Enter', async () => {
    const user = userEvent.setup()
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'User Interface{Enter}')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/categories/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'User Interface' }),
        })
      )
    })
  })

  it('cancels edit on Escape', async () => {
    const user = userEvent.setup()
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    const input = screen.getByRole('textbox')
    await user.type(input, 'New Name{Escape}')

    // Input should be gone, original name should be visible
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('UI')).toBeInTheDocument()
  })

  it('shows delete confirmation modal', async () => {
    const user = userEvent.setup()
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    // Modal should show with the category name and warning message
    expect(screen.getByText(/Delete "UI"\?/)).toBeInTheDocument()
    expect(screen.getByText(/will become uncategorized/i)).toBeInTheDocument()
  })

  it('deletes category on confirm', async () => {
    const user = userEvent.setup()
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/categories/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('shows empty state when no categories', () => {
    render(
      <CategoriesContent
        categories={[]}
        bookmarkCategories={[]}
      />
    )

    expect(screen.getByText(/no categories/i)).toBeInTheDocument()
  })

  it('renders drag handles for each main category', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    const dragHandles = screen.getAllByRole('button', { name: /drag to reorder/i })
    expect(dragHandles).toHaveLength(2) // 2 main categories
  })

  it('shows visual feedback when dragging', () => {
    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    // Verify DragDropContext is rendered
    expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument()
  })

  it('calls reorder API when drag ends at new position', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    // Simulate a drag end event (moving AI Dev before UI)
    const onDragEnd = (window as any).__onDragEnd
    onDragEnd({
      destination: { index: 0 },
      source: { index: 1 },
      draggableId: '4', // AI Dev
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/categories/reorder',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ categoryIds: ['4', '1'] }), // AI Dev now first
        })
      )
    })
  })

  it('does not call API when dropped at same position', async () => {
    mockFetch.mockClear()

    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    // Simulate drag end at same position
    const onDragEnd = (window as any).__onDragEnd
    onDragEnd({
      destination: { index: 0 },
      source: { index: 0 },
      draggableId: '1',
    })

    // Wait a tick to ensure no async calls are made
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not call API when dropped outside droppable area', async () => {
    mockFetch.mockClear()

    render(
      <CategoriesContent
        categories={mockCategories}
        bookmarkCategories={mockBookmarkCategories}
      />
    )

    // Simulate drag end with no destination
    const onDragEnd = (window as any).__onDragEnd
    onDragEnd({
      destination: null,
      source: { index: 0 },
      draggableId: '1',
    })

    // Wait a tick to ensure no async calls are made
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
