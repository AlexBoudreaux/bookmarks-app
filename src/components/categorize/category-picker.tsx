'use client'

import { useEffect, useState } from 'react'
import { Database } from '@/types/database'
import { NewCategoryModal } from './new-category-modal'

type Category = Database['public']['Tables']['categories']['Row']

type PickerState = 'main' | 'subcategory' | 'ready'

interface CategoryPair {
  main: Category
  sub: Category
}

interface CategoryPickerProps {
  categories: Category[]
  onSelect: (category: Category) => void
  selectedPairs?: CategoryPair[]
  onSelectedPairsChange?: (pairs: CategoryPair[]) => void
  isShaking?: boolean
  onCategoryCreated?: (category: Category) => void
}

export function CategoryPicker({
  categories,
  onSelect,
  selectedPairs: controlledPairs,
  onSelectedPairsChange,
  isShaking = false,
  onCategoryCreated,
}: CategoryPickerProps) {
  const [state, setState] = useState<PickerState>('main')
  const [selectedMain, setSelectedMain] = useState<Category | null>(null)
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false)

  // Use controlled pairs if provided, otherwise manage internally
  const [internalPairs, setInternalPairs] = useState<CategoryPair[]>([])
  const selectedPairs = controlledPairs ?? internalPairs
  const setSelectedPairs = onSelectedPairsChange ?? setInternalPairs

  // Reset state when controlled pairs are cleared (navigation happened)
  useEffect(() => {
    if (controlledPairs?.length === 0) {
      setState('main')
      setSelectedMain(null)
    }
  }, [controlledPairs])

  const handleNewCategory = () => {
    setIsNewCategoryModalOpen(true)
  }

  const handleCategoryCreated = (newCategory: Category) => {
    // Notify parent to refresh categories list
    onCategoryCreated?.(newCategory)

    // If we created a main category while in main view, select it
    if (state === 'main' && !newCategory.parent_id) {
      handleMainCategorySelect(newCategory)
    }
    // If we created a subcategory while in subcategory view, select it
    else if (state === 'subcategory' && newCategory.parent_id === selectedMain?.id) {
      handleSubcategorySelect(newCategory)
    }
  }

  // Get main categories (no parent)
  const mainCategories = categories
    .filter(c => c.parent_id === null)
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 10)

  // Get subcategories of selected main category
  const subcategories = selectedMain
    ? categories
        .filter(c => c.parent_id === selectedMain.id)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 10)
    : []

  const handleMainCategorySelect = (category: Category) => {
    setSelectedMain(category)
    setState('subcategory')
    onSelect(category)
  }

  const handleSubcategorySelect = (category: Category) => {
    if (selectedMain) {
      setSelectedPairs([...selectedPairs, { main: selectedMain, sub: category }])
      setState('ready')
      onSelect(category)
    }
  }

  const handleAddMore = () => {
    setSelectedMain(null)
    setState('main')
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle if typing in an input or modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Handle minus key to open new category modal in main or subcategory state
      if (e.key === '-' && (state === 'main' || state === 'subcategory')) {
        e.preventDefault()
        handleNewCategory()
        return
      }

      if (state === 'main') {
        // Handle 1-9 keys for main categories
        if (e.key >= '1' && e.key <= '9') {
          const index = parseInt(e.key) - 1
          if (mainCategories[index]) {
            handleMainCategorySelect(mainCategories[index])
          }
        }
        // Handle 0 key for 10th main category
        else if (e.key === '0') {
          if (mainCategories[9]) {
            handleMainCategorySelect(mainCategories[9])
          }
        }
      } else if (state === 'subcategory') {
        // Handle 1-9 keys for subcategories
        if (e.key >= '1' && e.key <= '9') {
          const index = parseInt(e.key) - 1
          if (subcategories[index]) {
            handleSubcategorySelect(subcategories[index])
          }
        }
        // Handle 0 key for 10th subcategory
        else if (e.key === '0') {
          if (subcategories[9]) {
            handleSubcategorySelect(subcategories[9])
          }
        }
      } else if (state === 'ready') {
        // Handle Enter key to add more categories
        if (e.key === 'Enter') {
          handleAddMore()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [state, mainCategories, subcategories, selectedMain, selectedPairs])

  const shakeClass = isShaking ? 'animate-shake' : ''

  return (
    <div className={`bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8 ${shakeClass}`}>
      {/* Show selected category pairs as chips */}
      {selectedPairs.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-zinc-600 mb-3">Selected:</p>
          <div className="flex flex-wrap gap-2">
            {selectedPairs.map((pair, index) => (
              <div
                key={index}
                className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-400"
              >
                {pair.main.name} &gt; {pair.sub.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        {state === 'main' && (
          <>
            <h3 className="text-lg font-medium text-zinc-400 mb-1">Categories</h3>
            <p className="text-sm text-zinc-600">Press 1-9 or 0 to select</p>
          </>
        )}
        {state === 'subcategory' && selectedMain && (
          <>
            <h3 className="text-lg font-medium text-zinc-400 mb-1">
              {selectedMain.name} → Subcategory
            </h3>
            <p className="text-sm text-zinc-600">Press 1-9 or 0 to select</p>
          </>
        )}
        {state === 'ready' && (
          <>
            <h3 className="text-lg font-medium text-zinc-400 mb-1">Category Added</h3>
            <p className="text-sm text-zinc-600">Press Enter to add more</p>
          </>
        )}
      </div>

      {/* Category/Subcategory grid */}
      {(state === 'main' || state === 'ready') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {mainCategories.map((category, index) => {
            const keyHint = index === 9 ? '0' : (index + 1).toString()
            return (
              <div key={category.id} className="relative group/btn">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-xl opacity-0 group-hover/btn:opacity-100 blur-sm transition-all duration-200" />
                <button
                  onClick={() => handleMainCategorySelect(category)}
                  className="relative w-full h-14 bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-600 rounded-xl px-3 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5"
                  aria-label={`${category.name} - Press ${keyHint}`}
                >
                  <div className="flex items-center gap-2.5 h-full">
                    <span className="shrink-0 text-xs font-mono text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 w-6 h-6 flex items-center justify-center rounded-md">
                      {keyHint}
                    </span>
                    <span className="text-sm text-zinc-300 truncate">{category.name}</span>
                  </div>
                </button>
              </div>
            )
          })}

          {/* New category button */}
          <div className="relative group/btn">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-500/20 to-zinc-400/20 rounded-xl opacity-0 group-hover/btn:opacity-100 blur-sm transition-all duration-200" />
            <button
              onClick={handleNewCategory}
              className="relative w-full h-14 bg-zinc-800/30 hover:bg-zinc-800/50 border border-dashed border-zinc-700/50 hover:border-zinc-600 rounded-xl px-3 transition-all duration-200"
              aria-label="New category - Press -"
            >
              <div className="flex items-center gap-2.5 h-full">
                <span className="shrink-0 text-xs font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 w-6 h-6 flex items-center justify-center rounded-md">
                  -
                </span>
                <span className="text-sm text-zinc-500">New...</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {state === 'subcategory' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {subcategories.map((category, index) => {
            const keyHint = index === 9 ? '0' : (index + 1).toString()
            return (
              <div key={category.id} className="relative group/btn">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 rounded-xl opacity-0 group-hover/btn:opacity-100 blur-sm transition-all duration-200" />
                <button
                  onClick={() => handleSubcategorySelect(category)}
                  className="relative w-full h-14 bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-600 rounded-xl px-3 transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/5"
                  aria-label={`${category.name} - Press ${keyHint}`}
                >
                  <div className="flex items-center gap-2.5 h-full">
                    <span className="shrink-0 text-xs font-mono text-teal-400/80 bg-teal-500/10 border border-teal-500/20 w-6 h-6 flex items-center justify-center rounded-md">
                      {keyHint}
                    </span>
                    <span className="text-sm text-zinc-300 truncate">{category.name}</span>
                  </div>
                </button>
              </div>
            )
          })}

          {/* New subcategory button */}
          <div className="relative group/btn">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-500/20 to-zinc-400/20 rounded-xl opacity-0 group-hover/btn:opacity-100 blur-sm transition-all duration-200" />
            <button
              onClick={handleNewCategory}
              className="relative w-full h-14 bg-zinc-800/30 hover:bg-zinc-800/50 border border-dashed border-zinc-700/50 hover:border-zinc-600 rounded-xl px-3 transition-all duration-200"
              aria-label="New subcategory - Press -"
            >
              <div className="flex items-center gap-2.5 h-full">
                <span className="shrink-0 text-xs font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 w-6 h-6 flex items-center justify-center rounded-md">
                  -
                </span>
                <span className="text-sm text-zinc-500">New...</span>
              </div>
            </button>
          </div>
        </div>
      )}

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

      {/* New category modal */}
      <NewCategoryModal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        onCreated={handleCategoryCreated}
        parentCategory={state === 'subcategory' ? selectedMain : null}
      />
    </div>
  )
}
