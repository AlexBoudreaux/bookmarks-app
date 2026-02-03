'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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

interface SessionState {
  categoryPairs: CategoryPair[]
  skipped: boolean
}

interface CategorizeWrapperProps {
  categories: Category[]
  bookmarks: Bookmark[]
}

export function CategorizeWrapper({
  categories,
  bookmarks,
}: CategorizeWrapperProps) {
  // Position-based navigation (bookmarks array stays immutable)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedPairs, setSelectedPairs] = useState<CategoryPair[]>([])

  // Session state tracking for undo (maps bookmark ID to its processed state)
  const [sessionState, setSessionState] = useState<Map<string, SessionState>>(new Map())

  // UI states
  const [isShaking, setIsShaking] = useState(false)
  const [isSkipFlashing, setIsSkipFlashing] = useState(false)
  const [isNotesVisible, setIsNotesVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const totalCount = bookmarks.length
  const currentBookmark = bookmarks[currentIndex]
  const isAtEnd = currentIndex >= totalCount

  // Calculate session stats
  const categorizedCount = Array.from(sessionState.values()).filter(s => !s.skipped && s.categoryPairs.length > 0).length
  const skippedCount = Array.from(sessionState.values()).filter(s => s.skipped).length

  // Check if current bookmark was already processed this session
  const currentSessionState = currentBookmark ? sessionState.get(currentBookmark.id) : undefined
  const isProcessed = !!currentSessionState

  const handleSelectCategory = useCallback((category: Category) => {
    console.log('Selected category:', category.name)
  }, [])

  const handleSelectedPairsChange = useCallback((pairs: CategoryPair[]) => {
    setSelectedPairs(pairs)
  }, [])

  // Pre-populate categories when navigating to a processed item
  useEffect(() => {
    if (currentSessionState && currentSessionState.categoryPairs.length > 0) {
      setSelectedPairs(currentSessionState.categoryPairs)
    } else if (!currentSessionState) {
      setSelectedPairs([])
    }
  }, [currentIndex, currentSessionState])

  // Clear notes visibility when navigating
  useEffect(() => {
    setIsNotesVisible(false)
  }, [currentIndex])

  // Helper to check if selections changed from session state
  const hasSelectionsChanged = useCallback(() => {
    if (!currentSessionState) return true // Not processed yet, always save

    const prevPairs = currentSessionState.categoryPairs
    if (prevPairs.length !== selectedPairs.length) return true

    // Compare category IDs
    const prevIds = new Set(prevPairs.flatMap(p => [p.main.id, p.sub.id]))
    const currIds = new Set(selectedPairs.flatMap(p => [p.main.id, p.sub.id]))

    if (prevIds.size !== currIds.size) return true
    for (const id of prevIds) {
      if (!currIds.has(id)) return true
    }
    return false
  }, [currentSessionState, selectedPairs])

  const moveToNext = useCallback(async () => {
    if (!currentBookmark) return

    if (selectedPairs.length === 0) {
      // Shake animation when no category selected
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      return
    }

    // Clear any previous error
    setErrorMessage(null)

    // No-op detection: if nothing changed, just advance
    if (!hasSelectionsChanged() && !currentSessionState?.skipped) {
      setCurrentIndex(prev => prev + 1)
      return
    }

    // Collect all category IDs (both main and sub from each pair)
    const categoryIds = selectedPairs.flatMap(pair => [pair.main.id, pair.sub.id])

    setIsSaving(true)
    try {
      const response = await fetch('/api/bookmarks/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmarkId: currentBookmark.id,
          categoryIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to save (${response.status})`)
      }

      // Update session state
      setSessionState(prev => {
        const next = new Map(prev)
        next.set(currentBookmark.id, { categoryPairs: [...selectedPairs], skipped: false })
        return next
      })

      // Advance to next
      setCurrentIndex(prev => prev + 1)
    } catch (error) {
      console.error('Failed to save categorization:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save categorization')
    } finally {
      setIsSaving(false)
    }
  }, [selectedPairs, currentBookmark, hasSelectionsChanged, currentSessionState])

  const moveToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setErrorMessage(null)
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const toggleNotes = useCallback(() => {
    setIsNotesVisible(prev => !prev)
  }, [])

  const handleSkip = useCallback(async () => {
    if (!currentBookmark) return

    // Clear any previous error
    setErrorMessage(null)

    // If already skipped this session and pressing skip again, just advance
    if (currentSessionState?.skipped) {
      setCurrentIndex(prev => prev + 1)
      return
    }

    // Show red flash animation
    setIsSkipFlashing(true)
    setTimeout(() => setIsSkipFlashing(false), 200)

    setIsSaving(true)
    try {
      const response = await fetch('/api/bookmarks/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarkId: currentBookmark.id }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to skip (${response.status})`)
      }

      // Update session state
      setSessionState(prev => {
        const next = new Map(prev)
        next.set(currentBookmark.id, { categoryPairs: [], skipped: true })
        return next
      })

      // Clear selected pairs and advance
      setSelectedPairs([])
      setCurrentIndex(prev => prev + 1)
    } catch (error) {
      console.error('Failed to skip bookmark:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to skip bookmark')
    } finally {
      setIsSaving(false)
    }
  }, [currentBookmark, currentSessionState])

  // Open current bookmark in new tab
  const openLink = useCallback(() => {
    if (currentBookmark?.url) {
      window.open(currentBookmark.url, '_blank', 'noopener,noreferrer')
    }
  }, [currentBookmark])

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
      } else if (e.key === 'Enter') {
        e.preventDefault()
        openLink()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveToNext, moveToPrevious, handleSkip, toggleNotes, openLink])

  // Show empty state (no bookmarks were loaded from server)
  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No bookmarks to categorize</p>
      </div>
    )
  }

  // Show end of list state (processed all bookmarks in this session)
  if (isAtEnd) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-zinc-100 mb-2">End of list</h3>
        <p className="text-zinc-400 mb-6">
          This session: {categorizedCount} categorized, {skippedCount} skipped
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={moveToPrevious}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2"
          >
            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] font-mono">←</kbd>
            Go back
          </button>
          <Link
            href="/browse"
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Export
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Skip flash overlay */}
      {isSkipFlashing && (
        <div
          data-testid="skip-flash"
          className="absolute inset-0 bg-red-500/20 rounded-2xl pointer-events-none z-50 animate-pulse"
        />
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-400">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-zinc-600">Progress</span>
          {currentSessionState?.skipped && (
            <span className="px-2 py-0.5 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded">
              Previously skipped
            </span>
          )}
          {isProcessed && !currentSessionState?.skipped && (
            <span className="px-2 py-0.5 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded">
              Previously categorized
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-zinc-500">
            <span className="text-emerald-400">{categorizedCount}</span> categorized
            <span className="mx-1.5">·</span>
            <span className="text-red-400">{skippedCount}</span> skipped
          </div>
          <div className="font-mono">
            <span className="text-zinc-100">{currentIndex + 1}</span>
            <span className="text-zinc-600 mx-1">of</span>
            <span className="text-zinc-400">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Side-by-side layout: Preview (left) + Categories (right) */}
      <div className="flex gap-6 h-full min-h-0">
        {/* Left: Bookmark preview - contained within viewport */}
        <div className="w-[55%] flex-shrink-0 flex flex-col min-h-0">
          <div className="relative group flex-1 min-h-0">
            {/* Decorative background glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className={`relative bg-zinc-900/50 backdrop-blur-sm border rounded-2xl p-6 transition-colors h-full overflow-hidden ${isSkipFlashing ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800/50'}`}>
              {isSaving && (
                <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10 rounded-2xl">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="h-full overflow-y-auto">
                {currentBookmark && currentBookmark.is_tweet ? (
                  <TweetPreview url={currentBookmark.url} />
                ) : currentBookmark ? (
                  <LinkCard title={currentBookmark.title || ''} url={currentBookmark.url} ogImage={currentBookmark.og_image} />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Category picker + Notes */}
        <div className="flex-1 flex flex-col min-h-0">
          <CategoryPicker
            categories={categories}
            onSelect={handleSelectCategory}
            selectedPairs={selectedPairs}
            onSelectedPairsChange={handleSelectedPairsChange}
            isShaking={isShaking}
          />

          {/* Notes hint */}
          <div className="flex items-center justify-center mt-2 text-xs text-zinc-500">
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
      </div>
    </div>
  )
}
