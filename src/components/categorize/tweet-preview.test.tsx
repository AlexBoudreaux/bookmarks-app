import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TweetPreview } from './tweet-preview'

// Mock react-tweet
vi.mock('react-tweet', () => ({
  Tweet: ({ id }: { id: string }) => <div data-testid="tweet-embed">{id}</div>,
  TweetNotFound: () => <div data-testid="tweet-not-found">Tweet not found</div>,
  TweetSkeleton: () => <div data-testid="tweet-skeleton">Loading...</div>,
}))

describe('TweetPreview', () => {
  it('renders tweet embed for valid tweet URL', () => {
    const url = 'https://twitter.com/naval/status/1629307668568633344'
    render(<TweetPreview url={url} />)

    expect(screen.getByTestId('tweet-embed')).toBeInTheDocument()
    expect(screen.getByText('1629307668568633344')).toBeInTheDocument()
  })

  it('renders tweet embed for x.com URL', () => {
    const url = 'https://x.com/naval/status/1234567890'
    render(<TweetPreview url={url} />)

    expect(screen.getByTestId('tweet-embed')).toBeInTheDocument()
    expect(screen.getByText('1234567890')).toBeInTheDocument()
  })

  it('renders fallback for non-tweet URL', () => {
    const url = 'https://github.com/vercel/next.js'
    render(<TweetPreview url={url} />)

    expect(screen.getByTestId('tweet-not-found')).toBeInTheDocument()
    expect(screen.getByText(/not a valid tweet url/i)).toBeInTheDocument()
  })

  it('renders fallback for empty URL', () => {
    render(<TweetPreview url="" />)

    expect(screen.getByTestId('tweet-not-found')).toBeInTheDocument()
  })
})
