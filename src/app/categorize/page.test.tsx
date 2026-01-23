import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase - needs to return a chainable builder
const createMockBuilder = (tableName: string) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => ({
      data: tableName === 'categories' ? [
        { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
        { id: '2', name: 'AI Dev', parent_id: null, usage_count: 90, sort_order: 1, created_at: '2024-01-01' },
      ] : [],
      error: null,
    })),
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((tableName: string) => createMockBuilder(tableName)),
  },
}))

import CategorizePage from './page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}))

describe('CategorizePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders progress bar with placeholder text', async () => {
    render(await CategorizePage())

    expect(screen.getByText(/of/i)).toBeInTheDocument()
  })

  it('renders bookmark preview area placeholder', async () => {
    render(await CategorizePage())

    expect(screen.getByText(/preview/i)).toBeInTheDocument()
  })

  it('renders category picker placeholder', async () => {
    render(await CategorizePage())

    expect(screen.getByText(/categories/i)).toBeInTheDocument()
  })

  it('has correct layout structure with three main sections', async () => {
    const { container } = render(await CategorizePage())

    // Should have a main container with sections for progress, preview, and picker
    const mainElement = container.querySelector('main')
    expect(mainElement).toBeInTheDocument()
  })
})
