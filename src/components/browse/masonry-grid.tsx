'use client'

import { useRef, useCallback, useMemo, ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'

interface MasonryGridProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  columnCountByBreakpoint?: { base: number; md?: number; lg?: number; xl?: number }
  gap?: number
  resetKey?: string | number
  className?: string
}

export function MasonryGrid<T>({
  items,
  getKey,
  renderItem,
  columnCountByBreakpoint = { base: 1, md: 2, lg: 3, xl: 4 },
  gap = 16,
  resetKey,
  className,
}: MasonryGridProps<T>) {
  const isMd = useMediaQuery('(min-width: 768px)')
  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')

  const columnCount = isXl
    ? (columnCountByBreakpoint.xl ?? columnCountByBreakpoint.lg ?? columnCountByBreakpoint.md ?? columnCountByBreakpoint.base)
    : isLg
      ? (columnCountByBreakpoint.lg ?? columnCountByBreakpoint.md ?? columnCountByBreakpoint.base)
      : isMd
        ? (columnCountByBreakpoint.md ?? columnCountByBreakpoint.base)
        : columnCountByBreakpoint.base

  // Stable assignment map: item key -> column index
  const assignmentsRef = useRef<Map<string, number>>(new Map())
  // Track column heights for placement decisions
  const columnHeightsRef = useRef<number[]>([])
  // Track the last resetKey and columnCount to know when to clear assignments
  const prevResetKeyRef = useRef<string | number | undefined>(resetKey)
  const prevColumnCountRef = useRef<number>(columnCount)

  // Clear assignments when resetKey or columnCount changes
  if (resetKey !== prevResetKeyRef.current || columnCount !== prevColumnCountRef.current) {
    assignmentsRef.current = new Map()
    columnHeightsRef.current = []
    prevResetKeyRef.current = resetKey
    prevColumnCountRef.current = columnCount
  }

  // ResizeObserver callback to track actual column heights
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const observerRef = useRef<ResizeObserver | null>(null)

  const setColumnRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    columnRefs.current[index] = el

    // Lazy-init the observer
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const colIndex = columnRefs.current.indexOf(entry.target as HTMLDivElement)
          if (colIndex !== -1) {
            columnHeightsRef.current[colIndex] = entry.contentRect.height
          }
        }
      })
    }

    if (el) {
      observerRef.current.observe(el)
    }
  }, [])

  // Distribute items into columns
  const columns = useMemo(() => {
    const cols: T[][] = Array.from({ length: columnCount }, () => [])
    const assignments = assignmentsRef.current
    const heights = columnHeightsRef.current

    // Ensure heights array is sized correctly
    while (heights.length < columnCount) {
      heights.push(0)
    }

    for (const item of items) {
      const key = getKey(item)
      let colIndex = assignments.get(key)

      if (colIndex !== undefined && colIndex < columnCount) {
        // Already assigned and column still exists
        cols[colIndex].push(item)
      } else {
        // New item: assign to shortest column
        let shortest = 0
        let minItems = cols[0].length
        for (let i = 1; i < columnCount; i++) {
          // Prefer actual measured height, fall back to item count
          const heightA = heights[shortest] || minItems
          const heightB = heights[i] || cols[i].length
          if (heightB < heightA) {
            shortest = i
            minItems = cols[i].length
          }
        }
        assignments.set(key, shortest)
        cols[shortest].push(item)
      }
    }

    return cols
  }, [items, columnCount, getKey])

  return (
    <div
      data-testid="bookmark-grid"
      className={className}
      style={{ display: 'flex', gap, alignItems: 'flex-start' }}
    >
      {columns.map((colItems, colIndex) => (
        <div
          key={colIndex}
          ref={setColumnRef(colIndex)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap }}
        >
          {colItems.map((item) => (
            <div key={getKey(item)} className="masonry-item">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
