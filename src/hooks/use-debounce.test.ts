import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('returns debounced value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    )

    // Change the value
    rerender({ value: 'updated', delay: 300 })

    // Should still be initial value
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now should be updated
    expect(result.current).toBe('updated')
  })

  it('cancels previous timer when value changes rapidly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    )

    // Rapid changes
    rerender({ value: 'b', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'c', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'd', delay: 300 })

    // Should still be 'a' because we keep interrupting
    expect(result.current).toBe('a')

    // Wait for full delay from last change
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should be 'd', not 'b' or 'c'
    expect(result.current).toBe('d')
  })

  it('works with different delays', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'updated', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Not yet (500ms delay)
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Now should be updated
    expect(result.current).toBe('updated')
  })
})
