import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LinkCard } from './link-card'

describe('LinkCard', () => {
  it('displays bookmark title', () => {
    render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
      />
    )

    expect(screen.getByText('Example Article')).toBeInTheDocument()
  })

  it('displays OG image when provided', () => {
    const { container } = render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
        ogImage="https://example.com/og-image.jpg"
      />
    )

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/og-image.jpg')
  })

  it('shows fallback icon when no OG image', () => {
    const { container } = render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
      />
    )

    const img = container.querySelector('img')
    expect(img).not.toBeInTheDocument()
    // Should show link icon instead
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('lazy loads OG image', () => {
    const { container } = render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
        ogImage="https://example.com/og-image.jpg"
      />
    )

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('displays domain extracted from URL', () => {
    render(
      <LinkCard
        title="Example Article"
        url="https://www.example.com/article"
      />
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('displays full URL as link', () => {
    render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/article')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('displays link icon', () => {
    render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
      />
    )

    // SVG should be present
    const svg = screen.getByRole('link').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('has minimum height matching design spec', () => {
    const { container } = render(
      <LinkCard
        title="Example Article"
        url="https://example.com/article"
      />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('min-h-[500px]')
  })

  it('handles empty title gracefully', () => {
    render(
      <LinkCard
        title=""
        url="https://example.com/article"
      />
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('handles URLs without protocol', () => {
    render(
      <LinkCard
        title="Example"
        url="example.com/page"
      />
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('displays long URLs without breaking layout', () => {
    const longUrl = 'https://example.com/very/long/path/that/goes/on/and/on/with/many/segments'
    render(
      <LinkCard
        title="Example"
        url={longUrl}
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', longUrl)
  })

  it('shows OG image with empty alt for decorative purposes', () => {
    const { container } = render(
      <LinkCard
        title="Example"
        url="https://example.com"
        ogImage="https://example.com/og.jpg"
      />
    )

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
  })
})
