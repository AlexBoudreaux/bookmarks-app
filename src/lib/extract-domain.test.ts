import { describe, it, expect } from 'vitest'
import { extractDomain } from './extract-domain'

describe('extractDomain', () => {
  it('extracts domain from simple URL', () => {
    expect(extractDomain('https://example.com/path')).toBe('example.com')
  })

  it('extracts domain from URL with subdomain', () => {
    expect(extractDomain('https://www.github.com/user/repo')).toBe('github.com')
  })

  it('extracts domain from twitter.com URL', () => {
    expect(extractDomain('https://twitter.com/user/status/123')).toBe('twitter.com')
  })

  it('extracts domain from x.com URL', () => {
    expect(extractDomain('https://x.com/user/status/123')).toBe('x.com')
  })

  it('handles URL without protocol', () => {
    expect(extractDomain('example.com/path')).toBe('example.com')
  })

  it('handles URL with port number', () => {
    expect(extractDomain('https://example.com:8080/path')).toBe('example.com')
  })

  it('handles URL with query params', () => {
    expect(extractDomain('https://example.com/path?foo=bar')).toBe('example.com')
  })

  it('returns empty string for invalid URL', () => {
    expect(extractDomain('not a url')).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(extractDomain('')).toBe('')
  })

  it('removes www. prefix from domain', () => {
    expect(extractDomain('https://www.example.com')).toBe('example.com')
  })

  it('preserves non-www subdomains', () => {
    expect(extractDomain('https://api.example.com')).toBe('api.example.com')
  })
})
