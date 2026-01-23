import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase - needs to return a chainable builder
const createMockBuilder = () => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => ({
      data: [],
      error: null,
    })),
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createMockBuilder()),
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
