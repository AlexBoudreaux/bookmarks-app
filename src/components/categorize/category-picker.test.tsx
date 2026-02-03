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

      // Wait for animation to complete and subcategories to show
      await waitFor(() => {
        expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      })
      expect(screen.getByText('Components')).toBeInTheDocument()
      expect(screen.getByText('General UI')).toBeInTheDocument()

      // Should show breadcrumb with parent name
      expect(screen.getByText(/Subcategory/i)).toBeInTheDocument()
      expect(screen.getByText('UI')).toBeInTheDocument()
    })

    it('allows selecting subcategory with keyboard shortcuts', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={onSelect} />)

      // Select main category UI
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      })

      // Select subcategory "Landing Pages" (should be first)
      await user.keyboard('1')

      // Wait for selection animation and chip to appear
      await waitFor(() => {
        expect(screen.getByText(/UI > Landing Pages/i)).toBeInTheDocument()
      })
    })

    it('allows clicking subcategory to select', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Select main category UI with keyboard
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Components')).toBeInTheDocument()
      })

      // Click on Components subcategory
      const componentsButton = screen.getByRole('button', { name: /Components/ })
      await user.click(componentsButton)

      // Wait for selection animation and chip to appear
      await waitFor(() => {
        expect(screen.getByText(/UI > Components/i)).toBeInTheDocument()
      })
    })

    it('allows adding multiple category pairs', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Select first pair: UI > Landing Pages
      await user.keyboard('1') // UI
      await waitFor(() => {
        expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      })
      await user.keyboard('1') // Landing Pages

      // Wait for first chip to appear
      await waitFor(() => {
        expect(screen.getByText(/UI > Landing Pages/i)).toBeInTheDocument()
      })

      // In ready state, can select another main category directly
      await user.keyboard('2') // AI Dev
      await waitFor(() => {
        expect(screen.getByText('Prompts')).toBeInTheDocument()
      })
      await user.keyboard('1') // Prompts

      // Wait for second chip and verify both chips
      await waitFor(() => {
        expect(screen.getByText(/AI Dev > Prompts/i)).toBeInTheDocument()
      })
      expect(screen.getByText(/UI > Landing Pages/i)).toBeInTheDocument()
    })

    it('shows add another prompt after subcategory selected', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithSubs} onSelect={vi.fn()} />)

      // Select UI > Landing Pages
      await user.keyboard('1')
      await waitFor(() => {
        expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      })
      await user.keyboard('1')

      // Wait for selection animation and prompt to appear
      await waitFor(() => {
        expect(screen.getByText(/Add another/i)).toBeInTheDocument()
      })
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

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      })

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

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /New subcategory - Press -/ })).toBeInTheDocument()
      })

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

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Landing Pages')).toBeInTheDocument()
      })

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

  describe('Subcategory pagination', () => {
    // Create 15 subcategories for UI category to test pagination
    const mockCategoriesWithManySubs = [
      { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
      { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
      // 15 subcategories under UI, sorted by usage_count descending
      { id: 'sub1', name: 'Sub 1', parent_id: '1', usage_count: 150, sort_order: 0, created_at: '2024-01-01' },
      { id: 'sub2', name: 'Sub 2', parent_id: '1', usage_count: 140, sort_order: 1, created_at: '2024-01-01' },
      { id: 'sub3', name: 'Sub 3', parent_id: '1', usage_count: 130, sort_order: 2, created_at: '2024-01-01' },
      { id: 'sub4', name: 'Sub 4', parent_id: '1', usage_count: 120, sort_order: 3, created_at: '2024-01-01' },
      { id: 'sub5', name: 'Sub 5', parent_id: '1', usage_count: 110, sort_order: 4, created_at: '2024-01-01' },
      { id: 'sub6', name: 'Sub 6', parent_id: '1', usage_count: 100, sort_order: 5, created_at: '2024-01-01' },
      { id: 'sub7', name: 'Sub 7', parent_id: '1', usage_count: 90, sort_order: 6, created_at: '2024-01-01' },
      { id: 'sub8', name: 'Sub 8', parent_id: '1', usage_count: 80, sort_order: 7, created_at: '2024-01-01' },
      { id: 'sub9', name: 'Sub 9', parent_id: '1', usage_count: 70, sort_order: 8, created_at: '2024-01-01' },
      { id: 'sub10', name: 'Sub 10', parent_id: '1', usage_count: 60, sort_order: 9, created_at: '2024-01-01' },
      { id: 'sub11', name: 'Sub 11', parent_id: '1', usage_count: 50, sort_order: 10, created_at: '2024-01-01' },
      { id: 'sub12', name: 'Sub 12', parent_id: '1', usage_count: 40, sort_order: 11, created_at: '2024-01-01' },
      { id: 'sub13', name: 'Sub 13', parent_id: '1', usage_count: 30, sort_order: 12, created_at: '2024-01-01' },
      { id: 'sub14', name: 'Sub 14', parent_id: '1', usage_count: 20, sort_order: 13, created_at: '2024-01-01' },
      { id: 'sub15', name: 'Sub 15', parent_id: '1', usage_count: 10, sort_order: 14, created_at: '2024-01-01' },
    ]

    it('shows first 10 subcategories by default', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Should show Sub 1-10
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Sub ${i}`)).toBeInTheDocument()
      }

      // Should NOT show Sub 11-15 on first page
      expect(screen.queryByText('Sub 11')).not.toBeInTheDocument()
      expect(screen.queryByText('Sub 15')).not.toBeInTheDocument()
    })

    it('shows More button with page indicator when more than 10 subcategories exist', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Should show More button with = key hint
      expect(screen.getByRole('button', { name: /More.*Press =/ })).toBeInTheDocument()
    })

    it('does not show More button when 10 or fewer subcategories exist', async () => {
      const user = userEvent.setup()
      const mockCategoriesWithFewSubs = [
        { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
        { id: 'sub1', name: 'Sub 1', parent_id: '1', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
        { id: 'sub2', name: 'Sub 2', parent_id: '1', usage_count: 40, sort_order: 1, created_at: '2024-01-01' },
      ]

      render(<CategoryPicker categories={mockCategoriesWithFewSubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Should NOT show More button
      expect(screen.queryByRole('button', { name: /More.*Press =/ })).not.toBeInTheDocument()
    })

    it('shows page 2 subcategories when = key is pressed', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Press = to go to page 2
      await user.keyboard('=')

      // Should show Sub 11-15 on page 2
      await waitFor(() => {
        expect(screen.getByText('Sub 11')).toBeInTheDocument()
      })
      expect(screen.getByText('Sub 12')).toBeInTheDocument()
      expect(screen.getByText('Sub 15')).toBeInTheDocument()

      // Should NOT show Sub 1-10 on page 2
      expect(screen.queryByText('Sub 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Sub 10')).not.toBeInTheDocument()
    })

    it('shows page indicator "More (2/2)" on page 2', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Press = to go to page 2
      await user.keyboard('=')

      // Should show page indicator
      await waitFor(() => {
        expect(screen.getByText(/More \(2\/2\)/)).toBeInTheDocument()
      })
    })

    it('cycles back to page 1 when pressing = on last page', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      // Wait for subcategory view
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Press = to go to page 2
      await user.keyboard('=')

      await waitFor(() => {
        expect(screen.getByText('Sub 11')).toBeInTheDocument()
      })

      // Press = again to cycle back to page 1
      await user.keyboard('=')

      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })
      expect(screen.queryByText('Sub 11')).not.toBeInTheDocument()
    })

    it('resets to page 1 when selecting a different main category', async () => {
      const user = userEvent.setup()
      // Add subcategories under AI Dev too
      const categoriesWithMultipleMains = [
        ...mockCategoriesWithManySubs,
        { id: 'ai-sub1', name: 'AI Sub 1', parent_id: '2', usage_count: 50, sort_order: 0, created_at: '2024-01-01' },
      ]

      render(<CategoryPicker categories={categoriesWithMultipleMains} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Go to page 2
      await user.keyboard('=')

      await waitFor(() => {
        expect(screen.getByText('Sub 11')).toBeInTheDocument()
      })

      // Go back to main (Escape)
      await user.keyboard('{Escape}')

      // Select AI Dev (key 2)
      await user.keyboard('2')

      await waitFor(() => {
        expect(screen.getByText('AI Sub 1')).toBeInTheDocument()
      })

      // Go back and select UI again
      await user.keyboard('{Escape}')
      await user.keyboard('1')

      // Should be on page 1 again
      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })
      expect(screen.queryByText('Sub 11')).not.toBeInTheDocument()
    })

    it('allows selecting subcategory from page 2 with keyboard shortcut', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={onSelect} />)

      // Select UI category
      await user.keyboard('1')

      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Go to page 2
      await user.keyboard('=')

      await waitFor(() => {
        expect(screen.getByText('Sub 11')).toBeInTheDocument()
      })

      // Press 1 to select Sub 11 (first on page 2)
      await user.keyboard('1')

      // Should have selected Sub 11
      await waitFor(() => {
        expect(screen.getByText(/UI > Sub 11/)).toBeInTheDocument()
      })
    })

    it('clicking More button goes to next page', async () => {
      const user = userEvent.setup()
      render(<CategoryPicker categories={mockCategoriesWithManySubs} onSelect={vi.fn()} />)

      // Select UI category
      await user.keyboard('1')

      await waitFor(() => {
        expect(screen.getByText('Sub 1')).toBeInTheDocument()
      })

      // Click More button
      const moreButton = screen.getByRole('button', { name: /More.*Press =/ })
      await user.click(moreButton)

      // Should show page 2
      await waitFor(() => {
        expect(screen.getByText('Sub 11')).toBeInTheDocument()
      })
    })
  })
})
