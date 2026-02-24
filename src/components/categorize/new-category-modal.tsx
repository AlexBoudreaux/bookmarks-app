'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Category } from '@/db/schema'

interface NewCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (category: Category) => void
  parentCategory?: Category | null
}

export function NewCategoryModal({
  isOpen,
  onClose,
  onCreated,
  parentCategory,
}: NewCategoryModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('')
      setError(null)
      setIsSubmitting(false)
      // Focus input after a short delay to allow modal animation
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsSubmitting(true)
    setError(null)

    try {
      const body: { name: string; parent_id?: string } = { name: trimmedName }
      if (parentCategory) {
        body.parent_id = parentCategory.id
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create category')
        setIsSubmitting(false)
        return
      }

      onCreated(data.category)
      onClose()
    } catch (err) {
      console.error('Error creating category:', err)
      setError('Failed to create category')
      setIsSubmitting(false)
    }
  }

  const isSubcategory = Boolean(parentCategory)
  const title = isSubcategory ? 'New Subcategory' : 'New Category'
  const description = isSubcategory
    ? `Create a new subcategory under ${parentCategory?.name}`
    : 'Create a new main category'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <label htmlFor="category-name" className="sr-only">
              Category name
            </label>
            <Input
              ref={inputRef}
              id="category-name"
              aria-label="Category name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isSubcategory ? 'Subcategory name' : 'Category name'}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
