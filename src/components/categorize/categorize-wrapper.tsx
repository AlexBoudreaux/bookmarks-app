'use client'

import { useState, useEffect, useCallback } from 'react'
import { CategoryPicker } from './category-picker'
import { TweetPreview } from './tweet-preview'
import { LinkCard } from './link-card'
import { NotesField } from './notes-field'
import { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']
type Bookmark = Database['public']['Tables']['bookmarks']['Row']

interface CategoryPair {
  main: Category
  sub: Category
}

interface CategorizeWrapperProps {
  categories: Category[]
  bookmarks: Bookmark[]
  initialIndex?: number
  onIndexChange?: (index: number) => void
  onSkip?: (bookmark: Bookmark) => void
}

export function CategorizeWrapper({
  categories,
  bookmarks,
  initialIndex = 0,
  onIndexChange,
  onSkip,
}: CategorizeWrapperProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [selectedPairs, setSelectedPairs] = useState<CategoryPair[]>([])
  const [isShaking, setIsShaking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isSkipFlashing, setIsSkipFlashing] = useState(false)
  const [isNotesVisible, setIsNotesVisible] = useState(false)

  const currentBookmark = bookmarks[currentIndex]
  const totalCount = bookmarks.length
  const isAtStart = currentIndex === 0
  const isAtEnd = currentIndex >= totalCount - 1

  const handleSelectCategory = useCallback((category: Category) => {
    console.log('Selected category:', category.name)
  }, [])

  const handleSelectedPairsChange = useCallback((pairs: CategoryPair[]) => {
    setSelectedPairs(pairs)
  }, [])

  // Save position to settings table
  const savePosition = useCallback(async (index: number) => {
    try {
      await fetch('/api/settings/position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      })
    } catch (error) {
      console.error('Failed to save position:', error)
    }
  }, [])

  const moveToNext = useCallback(async () => {
    if (selectedPairs.length === 0) {
      // Shake animation when no category selected
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      return
    }

    // Save categorization to Supabase
    if (currentBookmark) {
      // Collect all category IDs (both main and sub from each pair)
      const categoryIds = selectedPairs.flatMap(pair => [pair.main.id, pair.sub.id])

      try {
        await fetch('/api/bookmarks/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookmarkId: currentBookmark.id,
            categoryIds,
          }),
        })
      } catch (error) {
        console.error('Failed to save categorization:', error)
      }
    }

    if (isAtEnd) {
      // Show completion state and reset position to 0
      setIsComplete(true)
      savePosition(0)
      return
    }

    // Clear selected pairs and hide notes for next bookmark
    setSelectedPairs([])
    setIsNotesVisible(false)
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    onIndexChange?.(newIndex)
    savePosition(newIndex)
  }, [selectedPairs, currentBookmark, isAtEnd, currentIndex, onIndexChange, savePosition])

  const moveToPrevious = useCallback(() => {
    if (isAtStart) {
      return
    }

    // Clear selected pairs and hide notes when going back
    setSelectedPairs([])
    setIsNotesVisible(false)
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    onIndexChange?.(newIndex)
    savePosition(newIndex)
  }, [isAtStart, currentIndex, onIndexChange, savePosition])

  const toggleNotes = useCallback(() => {
    setIsNotesVisible(prev => !prev)
  }, [])

  const handleSkip = useCallback(async () => {
    if (!currentBookmark) return

    // Call onSkip callback
    onSkip?.(currentBookmark)

    // Show red flash animation
    setIsSkipFlashing(true)
    setTimeout(() => setIsSkipFlashing(false), 200)

    // Mark as skipped in Supabase
    try {
      await fetch('/api/bookmarks/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarkId: currentBookmark.id }),
      })
    } catch (error) {
      console.error('Failed to skip bookmark:', error)
    }

    // Clear selected pairs
    setSelectedPairs([])

    // Move to next bookmark or show completion
    if (isAtEnd) {
      setIsComplete(true)
      savePosition(0)
    } else {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      onIndexChange?.(newIndex)
      savePosition(newIndex)
    }
  }, [currentBookmark, onSkip, isAtEnd, currentIndex, onIndexChange, savePosition])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input (except N key toggle)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveToNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveToPrevious()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleSkip()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        toggleNotes()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveToNext, moveToPrevious, handleSkip, toggleNotes])

  // Show empty state
  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No bookmarks to categorize</p>
      </div>
    )
  }

  // Show completion state
  if (isComplete) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-zinc-100 mb-2">All bookmarks categorized!</h3>
        <p className="text-zinc-400">Great job! You can now browse your organized collection.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Skip flash overlay */}
      {isSkipFlashing && (
        <div
          data-testid="skip-flash"
          className="absolute inset-0 bg-red-500/20 rounded-2xl pointer-events-none z-50 animate-pulse"
        />
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6 text-sm">
        <span className="text-zinc-600">Progress</span>
        <div className="font-mono">
          <span className="text-zinc-100">{currentIndex + 1}</span>
          <span className="text-zinc-600 mx-1">of</span>
          <span className="text-zinc-400">{totalCount}</span>
        </div>
      </div>

      {/* Bookmark preview */}
      <div className="mb-8">
        <div className="relative group">
          {/* Decorative background glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className={`relative bg-zinc-900/50 backdrop-blur-sm border rounded-2xl p-12 transition-colors ${isSkipFlashing ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800/50'}`}>
            {currentBookmark && currentBookmark.is_tweet ? (
              <TweetPreview url={currentBookmark.url} />
            ) : currentBookmark ? (
              <LinkCard title={currentBookmark.title || ''} url={currentBookmark.url} ogImage={currentBookmark.og_image} />
            ) : null}
          </div>
        </div>

        {/* Notes hint */}
        <div className="flex items-center justify-center mt-3 text-xs text-zinc-500">
          <span>Press</span>
          <kbd className="mx-1.5 px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">N</kbd>
          <span>to add notes</span>
        </div>

        {/* Notes field */}
        {currentBookmark && (
          <NotesField
            bookmarkId={currentBookmark.id}
            initialNotes={currentBookmark.notes}
            isVisible={isNotesVisible}
            onClose={() => setIsNotesVisible(false)}
          />
        )}
      </div>

      {/* Category picker */}
      <div className="relative">
        <CategoryPicker
          categories={categories}
          onSelect={handleSelectCategory}
          selectedPairs={selectedPairs}
          onSelectedPairsChange={handleSelectedPairsChange}
          isShaking={isShaking}
        />
      </div>
    </div>
  )
}
