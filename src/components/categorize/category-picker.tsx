'use client'

import { useEffect } from 'react'
import { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryPickerProps {
  categories: Category[]
  onSelect: (category: Category) => void
  selectedId?: string
}

export function CategoryPicker({ categories, onSelect, selectedId }: CategoryPickerProps) {
  // Sort by usage_count descending and take top 10
  const sortedCategories = [...categories]
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 10)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle 1-9 keys
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1
        if (sortedCategories[index]) {
          onSelect(sortedCategories[index])
        }
      }
      // Handle 0 key for 10th category
      else if (e.key === '0') {
        if (sortedCategories[9]) {
          onSelect(sortedCategories[9])
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [sortedCategories, onSelect])

  return (
    <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-zinc-400 mb-1">Categories</h3>
        <p className="text-sm text-zinc-600">Press 1-9 or 0 to select</p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {sortedCategories.map((category, index) => {
          const keyHint = index === 9 ? '0' : (index + 1).toString()
          const isSelected = selectedId === category.id

          return (
            <div key={category.id} className="relative group/btn">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl opacity-0 group-hover/btn:opacity-100 blur transition-opacity" />
              <button
                onClick={() => onSelect(category)}
                className={`relative w-full bg-zinc-800/30 hover:bg-zinc-800/50 border rounded-xl px-4 py-3 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700/50'
                }`}
                aria-label={`${category.name} - Press ${keyHint}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded">
                    {keyHint}
                  </span>
                  <span className={`text-sm ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {category.name}
                  </span>
                </div>
              </button>
            </div>
          )
        })}

        {/* New category button */}
        <div className="relative group/btn">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl opacity-0 group-hover/btn:opacity-100 blur transition-opacity" />
          <button
            className="relative w-full bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-left transition-all"
            aria-label="New category - Press -"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded">
                -
              </span>
              <span className="text-sm text-zinc-400">New...</span>
            </div>
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="mt-8 pt-6 border-t border-zinc-800/50">
        <div className="flex items-center justify-center gap-8 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs font-mono">←</kbd>
            <span>Previous</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs font-mono">Delete</kbd>
            <span>Skip</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs font-mono">→</kbd>
            <span>Next</span>
          </div>
        </div>
      </div>
    </div>
  )
}
