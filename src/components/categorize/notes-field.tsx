'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface NotesFieldProps {
  bookmarkId: string
  initialNotes: string | null
  isVisible: boolean
  onClose: () => void
}

export function NotesField({
  bookmarkId,
  initialNotes,
  isVisible,
  onClose,
}: NotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [lastSavedNotes, setLastSavedNotes] = useState(initialNotes ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset notes when bookmark changes
  useEffect(() => {
    setNotes(initialNotes ?? '')
    setLastSavedNotes(initialNotes ?? '')
  }, [initialNotes, bookmarkId])

  // Focus textarea when becoming visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isVisible])

  const saveNotes = useCallback(async () => {
    if (notes === lastSavedNotes) {
      return
    }

    try {
      await fetch('/api/bookmarks/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmarkId,
          notes,
        }),
      })
      setLastSavedNotes(notes)
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }, [bookmarkId, notes, lastSavedNotes])

  const handleBlur = useCallback(() => {
    saveNotes()
  }, [saveNotes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      saveNotes()
      onClose()
    }
  }, [saveNotes, onClose])

  if (!isVisible) {
    return null
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Add personal notes about this bookmark..."
          className="w-full h-32 px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl resize-none
                     text-zinc-100 placeholder:text-zinc-500
                     focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20
                     transition-colors"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-zinc-500">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">Esc</kbd>
          <span>to close</span>
        </div>
      </div>
    </div>
  )
}
