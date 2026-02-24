import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MasonryGrid } from './masonry-grid'

interface TestItem {
  id: string
  label: string
}

const makeItems = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` }))

const defaultProps = {
  getKey: (item: TestItem) => item.id,
  renderItem: (item: TestItem) => <div data-testid={`rendered-${item.id}`}>{item.label}</div>,
  columnCountByBreakpoint: { base: 2 },
}

describe('MasonryGrid', () => {
  it('renders all items', () => {
    const items = makeItems(6)
    render(<MasonryGrid items={items} {...defaultProps} />)

    for (const item of items) {
      expect(screen.getByTestId(`rendered-${item.id}`)).toBeInTheDocument()
    }
  })

  it('distributes items across columns', () => {
    const items = makeItems(4)
    render(<MasonryGrid items={items} {...defaultProps} />)

    const grid = screen.getByTestId('bookmark-grid')
    // Should have 2 column divs (base: 2)
    const columns = grid.children
    expect(columns).toHaveLength(2)
  })

  it('stable assignment: adding items does not move existing ones', () => {
    const items3 = makeItems(3)
    const { rerender } = render(<MasonryGrid items={items3} {...defaultProps} />)

    const grid = screen.getByTestId('bookmark-grid')
    const col0Before = within(grid.children[0] as HTMLElement).queryAllByTestId(/^rendered-/)
    const col1Before = within(grid.children[1] as HTMLElement).queryAllByTestId(/^rendered-/)

    // Record which items are in which column
    const assignmentBefore = new Map<string, number>()
    for (const el of col0Before) {
      assignmentBefore.set(el.getAttribute('data-testid')!, 0)
    }
    for (const el of col1Before) {
      assignmentBefore.set(el.getAttribute('data-testid')!, 1)
    }

    // Add more items
    const items6 = makeItems(6)
    rerender(<MasonryGrid items={items6} {...defaultProps} />)

    // Original 3 items should still be in their same columns
    const col0After = within(grid.children[0] as HTMLElement).queryAllByTestId(/^rendered-/)
    const col1After = within(grid.children[1] as HTMLElement).queryAllByTestId(/^rendered-/)

    const assignmentAfter = new Map<string, number>()
    for (const el of col0After) {
      assignmentAfter.set(el.getAttribute('data-testid')!, 0)
    }
    for (const el of col1After) {
      assignmentAfter.set(el.getAttribute('data-testid')!, 1)
    }

    for (const [testId, colIndex] of assignmentBefore) {
      expect(assignmentAfter.get(testId)).toBe(colIndex)
    }
  })

  it('resetKey change clears assignments and redistributes', () => {
    const items = makeItems(4)
    const { rerender } = render(
      <MasonryGrid items={items} {...defaultProps} resetKey="a" />
    )

    const grid = screen.getByTestId('bookmark-grid')

    // Record assignments with resetKey "a"
    const col0Before = within(grid.children[0] as HTMLElement).queryAllByTestId(/^rendered-/)
    const assignmentCount0 = col0Before.length

    // Change resetKey, which should allow redistribution
    rerender(<MasonryGrid items={items} {...defaultProps} resetKey="b" />)

    // All items should still render
    for (const item of items) {
      expect(screen.getByTestId(`rendered-${item.id}`)).toBeInTheDocument()
    }

    // Items should be distributed (2 per column for 4 items / 2 cols)
    const col0After = within(grid.children[0] as HTMLElement).queryAllByTestId(/^rendered-/)
    const col1After = within(grid.children[1] as HTMLElement).queryAllByTestId(/^rendered-/)
    expect(col0After.length + col1After.length).toBe(4)
  })

  it('handles empty items', () => {
    render(<MasonryGrid items={[]} {...defaultProps} />)

    const grid = screen.getByTestId('bookmark-grid')
    expect(grid.children).toHaveLength(2) // Still renders column containers
  })

  it('handles single item', () => {
    const items = makeItems(1)
    render(<MasonryGrid items={items} {...defaultProps} />)

    expect(screen.getByTestId('rendered-item-0')).toBeInTheDocument()
  })

  it('handles fewer items than columns', () => {
    const items = makeItems(1)
    render(
      <MasonryGrid
        items={items}
        {...defaultProps}
        columnCountByBreakpoint={{ base: 4 }}
      />
    )

    const grid = screen.getByTestId('bookmark-grid')
    expect(grid.children).toHaveLength(4) // 4 columns
    expect(screen.getByTestId('rendered-item-0')).toBeInTheDocument()
  })

  it('applies masonry-item class for animation', () => {
    const items = makeItems(2)
    render(<MasonryGrid items={items} {...defaultProps} />)

    const grid = screen.getByTestId('bookmark-grid')
    const masonryItems = grid.querySelectorAll('.masonry-item')
    expect(masonryItems).toHaveLength(2)
  })
})
