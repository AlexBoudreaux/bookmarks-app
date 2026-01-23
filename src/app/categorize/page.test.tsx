import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock TweetPreview component
vi.mock('@/components/categorize/tweet-preview', () => ({
  TweetPreview: ({ url }: { url: string }) => <div data-testid="tweet-preview">{url}</div>,
}))

// Mock LinkCard component
vi.mock('@/components/categorize/link-card', () => ({
  LinkCard: ({ title, url }: { title: string; url: string }) => (
    <div data-testid="link-card">
      <div>{title}</div>
      <div>{url}</div>
    </div>
  ),
}))

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
      ] : tableName === 'bookmarks' ? [
        { id: '1', url: 'https://twitter.com/test/status/123', title: 'Test Tweet', is_tweet: true, is_categorized: false, is_keeper: false, is_skipped: false },
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

  it('renders bookmark preview with tweet', async () => {
    render(await CategorizePage())

    // Should render TweetPreview component with the mock tweet URL
    expect(screen.getByTestId('tweet-preview')).toBeInTheDocument()
    expect(screen.getByText('https://twitter.com/test/status/123')).toBeInTheDocument()
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

  it('renders LinkCard for non-tweet bookmarks', async () => {
    // Override mock to return a non-tweet bookmark
    const { supabase } = await import('@/lib/supabase')
    const createMockBuilderWithNonTweet = (tableName: string) => {
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        order: vi.fn(() => ({
          data: tableName === 'categories' ? [
            { id: '1', name: 'UI', parent_id: null, usage_count: 100, sort_order: 0, created_at: '2024-01-01' },
          ] : tableName === 'bookmarks' ? [
            { id: '1', url: 'https://github.com/example/repo', title: 'Example Repo', is_tweet: false, is_categorized: false, is_keeper: false, is_skipped: false },
          ] : [],
          error: null,
        })),
      }
      return builder
    }
    vi.mocked(supabase.from).mockImplementation((tableName: string) => createMockBuilderWithNonTweet(tableName))

    render(await CategorizePage())

    expect(screen.getByTestId('link-card')).toBeInTheDocument()
    expect(screen.getByText('Example Repo')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/example/repo')).toBeInTheDocument()
  })
})
