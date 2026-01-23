import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryPicker } from './category-picker'

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

  it('highlights selected category', () => {
    const onSelect = vi.fn()

    render(<CategoryPicker categories={mockCategories} onSelect={onSelect} selectedId="1" />)

    const uiButton = screen.getByRole('button', { name: /UI/ })

    // Check if button has highlight styling
    expect(uiButton.className).toContain('border-emerald-500')
  })

  it('shows "New category" option with [-] key hint', () => {
    render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

    expect(screen.getByText(/New/)).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('shows instruction text', () => {
    render(<CategoryPicker categories={mockCategories} onSelect={vi.fn()} />)

    expect(screen.getByText(/Press 1-9 or 0 to select/)).toBeInTheDocument()
  })
})
