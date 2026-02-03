'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedMainIndex, setSelectedMainIndex] = useState<number | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [subcategoryPage, setSubcategoryPage] = useState(0)

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

  // Get all subcategories of selected main category (for pagination)
  const allSubcategories = selectedMain
    ? categories
        .filter(c => c.parent_id === selectedMain.id)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    : []

  // Calculate pagination
  const totalSubcategoryPages = Math.ceil(allSubcategories.length / 10)
  const hasMultiplePages = totalSubcategoryPages > 1

  // Get subcategories for current page
  const subcategories = allSubcategories.slice(subcategoryPage * 10, (subcategoryPage + 1) * 10)

  const handleMainCategorySelect = (category: Category, index?: number) => {
    // Highlight the selected button
    setHighlightedIndex(index ?? null)
    setSelectedMain(category)
    setSelectedMainIndex(index ?? null)
    setSubcategoryPage(0) // Reset to first page when selecting new main category
    setIsAnimating(true)
    // Small delay for animation - shows highlight then transitions
    setTimeout(() => {
      setState('subcategory')
      setIsAnimating(false)
      setHighlightedIndex(null)
    }, 200)
    onSelect(category)
  }

  const handleSubcategorySelect = (category: Category, index?: number) => {
    if (selectedMain) {
      // Highlight briefly
      setHighlightedIndex(index ?? null)
      setTimeout(() => {
        setSelectedPairs([...selectedPairs, { main: selectedMain, sub: category }])
        setState('ready')
        setHighlightedIndex(null)
      }, 150)
      onSelect(category)
    }
  }

  const handleAddMore = () => {
    setSelectedMain(null)
    setState('main')
  }

  // Go back from subcategory to main category selection
  const handleGoBackToMain = () => {
    setSelectedMain(null)
    setState(selectedPairs.length > 0 ? 'ready' : 'main')
    setHighlightedIndex(null)
  }

  // Handle pagination for subcategories
  const handleNextPage = () => {
    if (hasMultiplePages) {
      setSubcategoryPage((prev) => (prev + 1) % totalSubcategoryPages)
    }
  }

  // Remove a selected pair
  const handleRemovePair = (index: number) => {
    const newPairs = selectedPairs.filter((_, i) => i !== index)
    setSelectedPairs(newPairs)
    // If we removed the last pair and we're in ready state, go back to main
    if (newPairs.length === 0 && state === 'ready') {
      setState('main')
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle if typing in an input or modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Handle Escape to go back from subcategory to main
      if (e.key === 'Escape' && state === 'subcategory') {
        e.preventDefault()
        handleGoBackToMain()
        return
      }

      // Handle minus key to open new category modal in main or subcategory state
      if (e.key === '-' && (state === 'main' || state === 'subcategory')) {
        e.preventDefault()
        handleNewCategory()
        return
      }

      // Handle = key for subcategory pagination
      if (e.key === '=' && state === 'subcategory' && hasMultiplePages) {
        e.preventDefault()
        handleNextPage()
        return
      }

      if (state === 'main' || state === 'ready') {
        // Handle 1-9 keys for main categories
        if (e.key >= '1' && e.key <= '9') {
          const index = parseInt(e.key) - 1
          if (mainCategories[index]) {
            handleMainCategorySelect(mainCategories[index], index)
          }
        }
        // Handle 0 key for 10th main category
        else if (e.key === '0') {
          if (mainCategories[9]) {
            handleMainCategorySelect(mainCategories[9], 9)
          }
        }
      } else if (state === 'subcategory') {
        // Handle 1-9 keys for subcategories
        if (e.key >= '1' && e.key <= '9') {
          const index = parseInt(e.key) - 1
          if (subcategories[index]) {
            handleSubcategorySelect(subcategories[index], index)
          }
        }
        // Handle 0 key for 10th subcategory
        else if (e.key === '0') {
          if (subcategories[9]) {
            handleSubcategorySelect(subcategories[9], 9)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [state, mainCategories, subcategories, selectedMain, selectedPairs, hasMultiplePages, totalSubcategoryPages])

  const shakeClass = isShaking ? 'animate-shake' : ''

  return (
    <div className={`bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-4 h-full flex flex-col ${shakeClass}`}>
      {/* Show selected category pairs as chips */}
      {selectedPairs.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-zinc-600 mb-2">Selected:</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedPairs.map((pair, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400"
              >
                <span>{pair.main.name} &gt; {pair.sub.name}</span>
                <button
                  onClick={() => handleRemovePair(index)}
                  className="ml-0.5 p-0.5 hover:bg-emerald-500/20 rounded transition-colors"
                  aria-label={`Remove ${pair.main.name} > ${pair.sub.name}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        {(state === 'main' || state === 'ready') && (
          <>
            <h3 className="text-base font-medium text-zinc-300 mb-1">
              {selectedPairs.length > 0 ? 'Add another?' : 'Select category'}
            </h3>
            <p className="text-xs text-zinc-500">Press 1-9 or 0</p>
          </>
        )}
        {state === 'subcategory' && selectedMain && (
          <>
            <h3 className="text-base font-medium text-zinc-300 mb-1">
              <span className="text-emerald-400">{selectedMain.name}</span> → Subcategory
            </h3>
            <p className="text-xs text-zinc-500">
              Press 1-9 or 0
              <span className="mx-1.5 text-zinc-600">·</span>
              <kbd className="px-1 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] font-mono">Esc</kbd>
              <span className="ml-1">to go back</span>
            </p>
          </>
        )}
      </div>

      {/* Category/Subcategory grid - flows in columns (1-5 left, 6-0 right, New below) */}
      {(state === 'main' || state === 'ready') && (
        <div className={`grid grid-rows-6 grid-flow-col gap-2 flex-1 content-start transition-opacity duration-150 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {mainCategories.map((category, index) => {
            const keyHint = index === 9 ? '0' : (index + 1).toString()
            const isHighlighted = highlightedIndex === index
            return (
              <button
                key={category.id}
                onClick={() => handleMainCategorySelect(category, index)}
                className={`relative w-full h-12 border rounded-lg px-3 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                  isHighlighted
                    ? 'bg-emerald-500/20 border-emerald-500 scale-[1.02] ring-2 ring-emerald-500/50'
                    : 'bg-zinc-800/50 hover:bg-zinc-800/80 border-zinc-700/50 hover:border-emerald-500/50'
                }`}
                aria-label={`${category.name} - Press ${keyHint}`}
              >
                <div className="flex items-center gap-2.5 h-full">
                  <span className={`shrink-0 text-sm font-mono w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    isHighlighted
                      ? 'text-emerald-300 bg-emerald-500/30 border border-emerald-400'
                      : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  }`}>
                    {keyHint}
                  </span>
                  <span className={`text-sm truncate transition-colors ${isHighlighted ? 'text-white' : 'text-zinc-200'}`}>
                    {category.name}
                  </span>
                </div>
              </button>
            )
          })}

          {/* New category button */}
          <button
            onClick={handleNewCategory}
            className="relative w-full h-12 bg-zinc-800/30 hover:bg-zinc-800/50 border border-dashed border-zinc-700/50 hover:border-zinc-500 rounded-lg px-3 transition-all duration-200"
            aria-label="New category - Press -"
          >
            <div className="flex items-center gap-2.5 h-full">
              <span className="shrink-0 text-sm font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 w-6 h-6 flex items-center justify-center rounded">
                -
              </span>
              <span className="text-sm text-zinc-500">New...</span>
            </div>
          </button>
        </div>
      )}

      {state === 'subcategory' && (
        <div className="grid grid-rows-6 grid-flow-col gap-2 flex-1 content-start animate-in fade-in slide-in-from-left-2 duration-200">
          {subcategories.map((category, index) => {
            const keyHint = index === 9 ? '0' : (index + 1).toString()
            const isHighlighted = highlightedIndex === index
            return (
              <button
                key={category.id}
                onClick={() => handleSubcategorySelect(category, index)}
                className={`relative w-full h-12 border rounded-lg px-3 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                  isHighlighted
                    ? 'bg-teal-500/20 border-teal-500 scale-[1.02] ring-2 ring-teal-500/50'
                    : 'bg-zinc-800/50 hover:bg-zinc-800/80 border-zinc-700/50 hover:border-teal-500/50'
                }`}
                aria-label={`${category.name} - Press ${keyHint}`}
              >
                <div className="flex items-center gap-2.5 h-full">
                  <span className={`shrink-0 text-sm font-mono w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    isHighlighted
                      ? 'text-teal-300 bg-teal-500/30 border border-teal-400'
                      : 'text-teal-400 bg-teal-500/10 border border-teal-500/20'
                  }`}>
                    {keyHint}
                  </span>
                  <span className={`text-sm truncate transition-colors ${isHighlighted ? 'text-white' : 'text-zinc-200'}`}>
                    {category.name}
                  </span>
                </div>
              </button>
            )
          })}

          {/* New subcategory button */}
          <button
            onClick={handleNewCategory}
            className="relative w-full h-12 bg-zinc-800/30 hover:bg-zinc-800/50 border border-dashed border-zinc-700/50 hover:border-zinc-500 rounded-lg px-3 transition-all duration-200"
            aria-label="New subcategory - Press -"
          >
            <div className="flex items-center gap-2.5 h-full">
              <span className="shrink-0 text-sm font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 w-6 h-6 flex items-center justify-center rounded">
                -
              </span>
              <span className="text-sm text-zinc-500">New...</span>
            </div>
          </button>

          {/* More button for pagination - only show when there are multiple pages */}
          {hasMultiplePages && (
            <button
              onClick={handleNextPage}
              className="relative w-full h-12 bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/50 hover:border-teal-500/50 rounded-lg px-3 transition-all duration-200"
              aria-label={`More subcategories - Press =`}
            >
              <div className="flex items-center gap-2.5 h-full">
                <span className="shrink-0 text-sm font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 w-6 h-6 flex items-center justify-center rounded">
                  =
                </span>
                <span className="text-sm text-zinc-500">
                  More ({subcategoryPage + 1}/{totalSubcategoryPages})
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Keyboard hints */}
      <div className="mt-auto pt-3 border-t border-zinc-800/50">
        <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] font-mono">←</kbd>
            <span>Back</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] font-mono">Del</kbd>
            <span>Skip</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] font-mono">→</kbd>
            <span>Save & Next</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] font-mono">⏎</kbd>
            <span>Open Link</span>
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
