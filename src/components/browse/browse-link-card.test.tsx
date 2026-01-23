import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowseLinkCard } from './browse-link-card'

describe('BrowseLinkCard', () => {
  const defaultProps = {
    url: 'https://example.com/article',
    title: 'Test Article',
    domain: 'example.com',
    notes: null,
    ogImage: null,
  }

  it('renders title', () => {
    render(<BrowseLinkCard {...defaultProps} />)

    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('renders domain', () => {
    render(<BrowseLinkCard {...defaultProps} />)

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('renders "Untitled" when title is null', () => {
    render(<BrowseLinkCard {...defaultProps} title={null} />)

    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('extracts domain from URL when domain prop is null', () => {
    render(<BrowseLinkCard {...defaultProps} domain={null} />)

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('renders link to URL', () => {
    render(<BrowseLinkCard {...defaultProps} />)

    const link = screen.getByRole('link', { name: /open link/i })
    expect(link).toHaveAttribute('href', 'https://example.com/article')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders notes when present', () => {
    render(<BrowseLinkCard {...defaultProps} notes="This is my note about the article" />)

    expect(screen.getByText('This is my note about the article')).toBeInTheDocument()
  })

  it('does not render notes section when notes is null', () => {
    render(<BrowseLinkCard {...defaultProps} notes={null} />)

    expect(screen.queryByText(/note/i)).not.toBeInTheDocument()
  })

  it('renders OG image when present', () => {
    const { container } = render(<BrowseLinkCard {...defaultProps} ogImage="https://example.com/og-image.jpg" />)

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/og-image.jpg')
  })

  it('shows placeholder icon when no OG image', () => {
    const { container } = render(<BrowseLinkCard {...defaultProps} ogImage={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // Should show FileText icon placeholder
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has lazy loading on OG image', () => {
    const { container } = render(<BrowseLinkCard {...defaultProps} ogImage="https://example.com/og-image.jpg" />)

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('loading', 'lazy')
  })
})
