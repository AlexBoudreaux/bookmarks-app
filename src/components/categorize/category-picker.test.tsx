import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryPicker } from './category-picker'

// Mock fetch for new category modal
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CategoryPicker', () => {
  const mockCategories = [
    { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
    { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
    { id: '3', name: 'General Dev', parent_id: null, usage_count: 80, sort_order: 2, created_at: '2024-01-01' },
    { id: '4', name: 'Image Gen', parent_id: null, usage_count: 70, sort_order: 3, created_at: '2024-01-01' },
    { id: '5', name: 'Design', parent_id: null, usage_count: 60, sort_order: 4, created_at: '2024-01-01' },
    { id: '6', name: 'Business', parent_id: null, usage_count: 50, sort_order: 5, created_at: '2024-01-01' },
    { id: '7', name: 'Learning', parent_id: null, usage_count: 40, sort_order: 6, created_at: '2024-01-01' },
    { id: '8', name: 'Tools', parent_id: null, usage_count: 30, sort_order: 7, created_at: '2024-01-01' },
    { id: '9', name: 'Inspiration', parent_id: null, usage_count: 20, sort_order: 8, created_at: '2024-01-01' },
    { id: '10', name: 'Personal', parent_id: null, usage_count: 10, sort_order: 9, created_at: '2024-01-01' },
    { id: '11', name: 'Misc', parent_id: null, usage_count: 5, sort_order: 10, created_at: '2024-01-01' },
  ]

  it('renders top 10 categories sorted by usage_count', () => {
    render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

    // Should show first 10 categories
    expect(screen.getByText('UI')).toBeInTheDocument()
    expect(screen.getByText('AI Dev')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()

    // 11th category should not be shown in keyboard shortcuts
    expect(screen.queryByText('Misc')).not.toBeInTheDocument()
  })

  it('displays keyboard hints [1]-[9] and [0] for first 10 categories', () => {
    render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

    // Check keyboard hints
    for (let i = 1; i <= 9; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('calls onSelect when a category is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<CategoryPicker categories={mockCategories} onSelect={onSelect} />)

    const uiButton = screen.getByRole('button', { name: /UI/ })
    await user.click(uiButton)

    expect(onSelect).toHaveBeenCalledWith(mockCategories[0])
  })

  it('calls onSelect when keyboard shortcut 1-9 is pressed', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<CategoryPicker categories={mockCategories} onSelect={onSelect} />)

    // Press "1" key
    await user.keyboard('1')

    expect(onSelect).toHaveBeenCalledWith(mockCategories[0])
  })

  it('calls onSelect when keyboard shortcut 0 is pressed for 10th category', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<CategoryPicker categories={mockCategories} onSelect={onSelect} />)

    // Press "0" key
    await user.keyboard('0')

    expect(onSelect).toHaveBeenCalledWith(mockCategories[9])
  })


  it('shows "New category" option with [-] key hint', () => {
    render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

    expect(screen.getByText(/New/)).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('shows instruction text', () => {
    render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

    expect(screen.getByText(/Press 1-9 or 0/)).toBeInTheDocument()
  })

  describe('Subcategory picker', () => {
    const mockCategoriesWithSubs = [
      { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
      { id: '1a', name: 'Landing Pages', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
      { id: '1b', name: 'Components', parent_id: '1', usage_count: 40, sort_order: 1, created_at: '2024-01-01' },
      { id: '1c', name: 'General UI', parent_id: '1', usage_count: 30, sort_order: 2, created_at: '2024-01-01' },
      { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
      { id: '2a', name: 'Prompts', parent_id: '2', usage_count: 45, sort_order: 0, created_at: '2024-01-01' },
      { id: '2b', name: 'Agents', parent_id: '2', usage_count: 35, sort_order: 1, created_at: '2024-01-01' },
    ]

    it('transitions to subcategory view after main category selected', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Initially shows main categories
      expect(screen.getByText('UI')).toBeInTheDocument()
      expect(screen.getByText('AI Dev')).toBeInTheDocument()

      // Press "1" to select UI
      await user.keyboard('1')

      // Should now show subcategories of UI
      expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      expect(screen.getByText('Components')).toBeInTheDocument()
      expect(screen.getByText('General UI')).toBeInTheDocument()

      // Should show breadcrumb
      expect(screen.getByText(/UI → Sub/i)).toBeInTheDocument()
    })

    it('allows selecting subcategory with keyboard shortcuts', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={onSelect} />)

      // Select main category UI
      await user.keyboard('1')

      // Select subcategory "Landing Pages" (should be first)
      await user.keyboard('1')

      // Should show chip with "UI > Landing Pages"
      expect(screen.getByText(/UI > Landing Pages/i)).toBeInTheDocument()
    })

    it('allows clicking subcategory to select', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Select main category UI with keyboard
      await user.keyboard('1')

      // Click on Components subcategory
      const componentsButton = screen.getByRole('button', { name: /Components/ })
      await user.click(componentsButton)

      // Should show chip with "UI > Components"
      expect(screen.getByText(/UI > Components/i)).toBeInTheDocument()
    })

    it('allows adding multiple category pairs with Enter key', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Select first pair: UI > Landing Pages
      await user.keyboard('1') // UI
      await user.keyboard('1') // Landing Pages

      // Press Enter to add another pair
      await user.keyboard('{Enter}')

      // Should still show first chip
      expect(screen.getByText(/UI > Landing Pages/i)).toBeInTheDocument()

      // Should be back in main categories view
      expect(screen.getByText('AI Dev')).toBeInTheDocument()

      // Select second pair: AI Dev > Prompts
      await user.keyboard('2') // AI Dev
      await user.keyboard('1') // Prompts

      // Should show both chips
      expect(screen.getByText(/UI > Landing Pages/i)).toBeInTheDocument()
      expect(screen.getByText(/AI Dev > Prompts/i)).toBeInTheDocument()
    })

    it('shows instruction to press Enter after subcategory selected', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Select UI > Landing Pages
      await user.keyboard('1')
      await user.keyboard('1')

      // Should show hint about pressing Enter for more
      expect(screen.getByText(/Enter to add more/i)).toBeInTheDocument()
    })
  })

  describe('New category modal', () => {
    beforeEach(() => {
      mockFetch.mockReset()
    })

    const mockCategories = [
      { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
      { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
      { id: '1a', name: 'Landing Pages', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
    ]

    it('opens new main category modal when minus key is pressed in main state', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

      // Press minus key
      await user.keyboard('-')

      // Modal should open with "New Category" title
      expect(screen.getByText('New Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Category name')).toBeInTheDocument()
    })

    it('opens new subcategory modal when minus key is pressed in subcategory state', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

      // First select a main category
      await user.keyboard('1')

      // Press minus key in subcategory view
      await user.keyboard('-')

      // Modal should open with "New Subcategory" title mentioning parent
      expect(screen.getByText('New Subcategory')).toBeInTheDocument()
      expect(screen.getByText(/under UI/)).toBeInTheDocument()
    })

    it('opens modal when New... button is clicked in main view', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

      // Click the "New..." button
      const newButton = screen.getByRole('button', { name: /New category - Press -/ })
      await user.click(newButton)

      // Modal should open
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    it('opens modal when New... button is clicked in subcategory view', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

      // First select a main category
      await user.keyboard('1')

      // Click the "New..." button for subcategory
      const newButton = screen.getByRole('button', { name: /New subcategory - Press -/ })
      await user.click(newButton)

      // Modal should open
      expect(screen.getByText('New Subcategory')).toBeInTheDocument()
    })

    it('calls onCategoryCreated when new main category is created', async () => {
      const user = userEvent.setup()
      const onCategoryCreated = vi.fn()
      const newCategory = {
        id: 'new-id',
        name: 'Test Category',
        parent_id: null,
        usage_count: 0,
        sort_order: 0,
        created_at: '2024-01-01',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ category: newCategory }),
      })

      render(
        <CategoryPicker
          categories={mockCategories}
          onSelect={vi.fn()}
          onCategoryCreated={onCategoryCreated}
        />
      )

      // Open modal
      await user.keyboard('-')

      // Fill in category name
      const input = screen.getByLabelText('Category name')
      await user.type(input, 'Test Category')

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(onCategoryCreated).toHaveBeenCalledWith(newCategory)
      })
    })

    it('calls onCategoryCreated when new subcategory is created', async () => {
      const user = userEvent.setup()
      const onCategoryCreated = vi.fn()
      const newCategory = {
        id: 'new-sub-id',
        name: 'New Subcat',
        parent_id: '1',
        usage_count: 0,
        sort_order: 0,
        created_at: '2024-01-01',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ category: newCategory }),
      })

      render(
        <CategoryPicker
          categories={mockCategories}
          onSelect={vi.fn()}
          onCategoryCreated={onCategoryCreated}
        />
      )

      // Select main category first
      await user.keyboard('1')

      // Open modal for subcategory
      await user.keyboard('-')

      // Fill in subcategory name
      const input = screen.getByLabelText('Category name')
      await user.type(input, 'New Subcat')

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(onCategoryCreated).toHaveBeenCalledWith(newCategory)
      })

      // Verify parent_id was passed to API
      expect(mockFetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
        body: JSON.stringify({ name: 'New Subcat', parent_id: '1' }),
      }))
    })
  })
})
