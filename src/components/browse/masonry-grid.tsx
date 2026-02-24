'use client'

import { useRef, useMemo, ReactNode } from 'react'
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
  // Track the last resetKey and columnCount to know when to clear assignments
  const prevResetKeyRef = useRef<string | number | undefined>(resetKey)
  const prevColumnCountRef = useRef<number>(columnCount)

  // Clear assignments when resetKey or columnCount changes
  if (resetKey !== prevResetKeyRef.current || columnCount !== prevColumnCountRef.current) {
    assignmentsRef.current = new Map()
    prevResetKeyRef.current = resetKey
    prevColumnCountRef.current = columnCount
  }

  // Stable ref for getKey so useMemo doesn't depend on it
  const getKeyRef = useRef(getKey)
  getKeyRef.current = getKey

  // Distribute items into columns using item count for balancing.
  // Item count is the only reliable metric during synchronous distribution
  // since measured heights are always stale (ResizeObserver fires async).
  const columns = useMemo(() => {
    const cols: T[][] = Array.from({ length: columnCount }, () => [])
    const assignments = assignmentsRef.current
    const currentGetKey = getKeyRef.current

    for (const item of items) {
      const key = currentGetKey(item)
      const colIndex = assignments.get(key)

      if (colIndex !== undefined && colIndex < columnCount) {
        cols[colIndex].push(item)
      } else {
        // New item: assign to column with fewest items
        let shortest = 0
        for (let i = 1; i < columnCount; i++) {
          if (cols[i].length < cols[shortest].length) {
            shortest = i
          }
        }
        assignments.set(key, shortest)
        cols[shortest].push(item)
      }
    }

    return cols
  }, [items, columnCount])

  return (
    <div
      data-testid="bookmark-grid"
      className={className}
      style={{ display: 'flex', gap, alignItems: 'flex-start', overflow: 'hidden' }}
    >
      {columns.map((colItems, colIndex) => (
        <div
          key={colIndex}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}
        >
          {colItems.map((item) => (
            <div key={getKeyRef.current(item)} className="masonry-item">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
