import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewCategoryModal } from './new-category-modal'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NewCategoryModal', () => {
  const mockOnClose = vi.fn()
  const mockOnCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders modal when open', () => {
    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    expect(screen.getByText('New Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Category name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <NewCategoryModal
        isOpen={false}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    expect(screen.queryByText('New Category')).not.toBeInTheDocument()
  })

  it('shows subcategory title when parentCategory is provided', () => {
    const parentCategory = {
      id: 'parent-id',
      name: 'AI Dev',
      parentId: null,
      usageCount: 5,
      sortOrder: 0,
      createdAt: '2026-01-23',
    }

    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
        parentCategory={parentCategory}
      />
    )

    expect(screen.getByText('New Subcategory')).toBeInTheDocument()
    expect(screen.getByText(/under AI Dev/)).toBeInTheDocument()
  })

  it('creates main category when form is submitted', async () => {
    const user = userEvent.setup()
    const newCategory = {
      id: 'new-id',
      name: 'Test Category',
      parentId: null,
      usageCount: 0,
      sortOrder: 0,
      createdAt: '2026-01-23',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ category: newCategory }),
    })

    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const input = screen.getByLabelText('Category name')
    await user.type(input, 'Test Category')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Category' }),
      })
    })

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledWith(newCategory)
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('creates subcategory when parentCategory is provided', async () => {
    const user = userEvent.setup()
    const parentCategory = {
      id: 'parent-id',
      name: 'AI Dev',
      parentId: null,
      usageCount: 5,
      sortOrder: 0,
      createdAt: '2026-01-23',
    }
    const newCategory = {
      id: 'new-sub-id',
      name: 'New Subcat',
      parentId: 'parent-id',
      usageCount: 0,
      sortOrder: 0,
      createdAt: '2026-01-23',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ category: newCategory }),
    })

    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
        parentCategory={parentCategory}
      />
    )

    const input = screen.getByLabelText('Category name')
    await user.type(input, 'New Subcat')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Subcat', parent_id: 'parent-id' }),
      })
    })

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledWith(newCategory)
    })
  })

  it('shows error when API call fails', async () => {
    const user = userEvent.setup()

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to create category' }),
    })

    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const input = screen.getByLabelText('Category name')
    await user.type(input, 'Test Category')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to create category')).toBeInTheDocument()
    })
    expect(mockOnCreated).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('disables create button when name is empty', () => {
    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const createButton = screen.getByRole('button', { name: 'Create' })
    expect(createButton).toBeDisabled()
  })

  it('clears input when modal is closed and reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const input = screen.getByLabelText('Category name')
    await user.type(input, 'Some text')
    expect(input).toHaveValue('Some text')

    // Close modal
    rerender(
      <NewCategoryModal
        isOpen={false}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    // Reopen modal
    rerender(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const newInput = screen.getByLabelText('Category name')
    expect(newInput).toHaveValue('')
  })

  it('submits form on Enter key press', async () => {
    const user = userEvent.setup()
    const newCategory = {
      id: 'new-id',
      name: 'Enter Test',
      parentId: null,
      usageCount: 0,
      sortOrder: 0,
      createdAt: '2026-01-23',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ category: newCategory }),
    })

    render(
      <NewCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    const input = screen.getByLabelText('Category name')
    await user.type(input, 'Enter Test')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
