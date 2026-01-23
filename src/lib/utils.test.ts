import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('merges class names correctly', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('handles conditional classes', () => {
    const result = cn('base-class', true && 'truthy-class', false && 'falsy-class')
    expect(result).toBe('base-class truthy-class')
  })

  it('merges conflicting Tailwind classes correctly', () => {
    // tailwind-merge should keep the last conflicting class
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('handles empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('handles arrays and objects', () => {
    const result = cn(['base', 'array'], { active: true, disabled: false })
    expect(result).toBe('base array active')
  })
})
