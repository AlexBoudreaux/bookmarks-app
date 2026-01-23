import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TweetCard } from './tweet-card'

// Mock react-tweet components
vi.mock('react-tweet', () => ({
  Tweet: ({ id }: { id: string }) => <div data-testid="tweet-embed">Tweet {id}</div>,
  TweetNotFound: () => <div data-testid="tweet-not-found">Tweet not found</div>,
  TweetSkeleton: () => <div data-testid="tweet-skeleton">Loading...</div>,
}))

describe('TweetCard', () => {
  it('renders tweet embed for valid twitter.com URL', () => {
    render(<TweetCard url="https://twitter.com/user/status/12345" title="Test tweet" />)

    expect(screen.getByTestId('tweet-embed')).toBeInTheDocument()
    expect(screen.getByTestId('tweet-embed')).toHaveTextContent('Tweet 12345')
  })

  it('renders tweet embed for valid x.com URL', () => {
    render(<TweetCard url="https://x.com/user/status/67890" title="Test tweet" />)

    expect(screen.getByTestId('tweet-embed')).toBeInTheDocument()
    expect(screen.getByTestId('tweet-embed')).toHaveTextContent('Tweet 67890')
  })

  it('renders fallback for invalid tweet URL', () => {
    render(<TweetCard url="https://example.com/not-a-tweet" title="Not a tweet" />)

    expect(screen.queryByTestId('tweet-embed')).not.toBeInTheDocument()
    expect(screen.getByText('Not a tweet')).toBeInTheDocument()
    expect(screen.getByText('Open on X')).toBeInTheDocument()
  })

  it('shows fallback title when title is null', () => {
    render(<TweetCard url="https://example.com/not-a-tweet" title={null} />)

    expect(screen.getByText('Tweet unavailable')).toBeInTheDocument()
  })

  it('renders link to open tweet in fallback', () => {
    render(<TweetCard url="https://twitter.com/invalid" title="Invalid" />)

    const link = screen.getByRole('link', { name: /open on x/i })
    expect(link).toHaveAttribute('href', 'https://twitter.com/invalid')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
