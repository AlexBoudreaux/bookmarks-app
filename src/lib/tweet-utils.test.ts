import { describe, it, expect } from 'vitest'
import { getTweetId } from './tweet-utils'

describe('getTweetId', () => {
  it('extracts tweet ID from twitter.com URL', () => {
    const url = 'https://twitter.com/naval/status/1629307668568633344'
    expect(getTweetId(url)).toBe('1629307668568633344')
  })

  it('extracts tweet ID from x.com URL', () => {
    const url = 'https://x.com/naval/status/1629307668568633344'
    expect(getTweetId(url)).toBe('1629307668568633344')
  })

  it('handles URLs with query parameters', () => {
    const url = 'https://twitter.com/naval/status/1629307668568633344?s=20'
    expect(getTweetId(url)).toBe('1629307668568633344')
  })

  it('handles URLs with hash fragments', () => {
    const url = 'https://x.com/naval/status/1629307668568633344#reply'
    expect(getTweetId(url)).toBe('1629307668568633344')
  })

  it('returns null for non-tweet URLs', () => {
    const url = 'https://github.com/vercel/next.js'
    expect(getTweetId(url)).toBeNull()
  })

  it('returns null for twitter.com URLs without status', () => {
    const url = 'https://twitter.com/naval'
    expect(getTweetId(url)).toBeNull()
  })

  it('handles http URLs', () => {
    const url = 'http://twitter.com/naval/status/1629307668568633344'
    expect(getTweetId(url)).toBe('1629307668568633344')
  })

  it('returns null for empty string', () => {
    expect(getTweetId('')).toBeNull()
  })
})
