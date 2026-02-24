'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { GripVertical, Pencil, Trash2, Plus, FolderOpen } from 'lucide-react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'

interface Category {
  id: string
  name: string
  parentId: string | null
  usageCount: number | null
  sortOrder: number | null
  createdAt: Date | null
}

interface BookmarkCategory {
  bookmarkId: string
  categoryId: string
}

interface CategoriesContentProps {
  categories: Category[]
  bookmarkCategories: BookmarkCategory[]
  onAddCategory?: () => void
}

export function CategoriesContent({
  categories: initialCategories,
  bookmarkCategories,
  onAddCategory,
}: CategoriesContentProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [isDragging, setIsDragging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [addingSubcatFor, setAddingSubcatFor] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Build bookmark count map
  const bookmarkCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const bc of bookmarkCategories) {
      map.set(bc.categoryId, (map.get(bc.categoryId) || 0) + 1)
    }
    return map
  }, [bookmarkCategories])

  // Get subcategories for a main category
  const getSubcategories = (mainId: string) => {
    return categories.filter(c => c.parentId === mainId)
  }

  // Get bookmark count for a category (including subcategories for main categories)
  const getBookmarkCount = (categoryId: string, isMain: boolean) => {
    if (!isMain) {
      return bookmarkCountMap.get(categoryId) || 0
    }
    // For main categories, sum up all subcategory counts
    const subcats = getSubcategories(categoryId)
    let total = 0
    for (const sub of subcats) {
      total += bookmarkCountMap.get(sub.id) || 0
    }
    return total
  }

  // Main categories sorted by sort_order
  const mainCategories = useMemo(() => {
    return categories
      .filter(c => c.parentId === null)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [categories])

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Focus add input when adding subcategory
  useEffect(() => {
    if ((addingSubcatFor || showAddModal) && addInputRef.current) {
      setTimeout(() => addInputRef.current?.focus(), 50)
    }
  }, [addingSubcatFor, showAddModal])

  // Listen for external add category trigger
  useEffect(() => {
    const handleAddCategory = () => setShowAddModal(true)
    window.addEventListener('add-category', handleAddCategory)
    return () => window.removeEventListener('add-category', handleAddCategory)
  }, [])

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditValue(category.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) {
      cancelEdit()
      return
    }

    try {
      const response = await fetch(`/api/categories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })

      if (response.ok) {
        setCategories(prev =>
          prev.map(c => (c.id === editingId ? { ...c, name: editValue.trim() } : c))
        )
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    }

    cancelEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return

    try {
      const response = await fetch(`/api/categories/${deleteConfirmId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove category and its subcategories from state
        setCategories(prev =>
          prev.filter(c => c.id !== deleteConfirmId && c.parentId !== deleteConfirmId)
        )
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
    }

    setDeleteConfirmId(null)
  }

  const getCategoryToDelete = () => {
    return categories.find(c => c.id === deleteConfirmId)
  }

  const addCategory = async (parentId: string | null = null) => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parent_id: parentId,
        }),
      })

      if (response.ok) {
        const { category } = await response.json()
        setCategories(prev => [...prev, category])
      }
    } catch (error) {
      console.error('Failed to add category:', error)
    }

    setNewCategoryName('')
    setAddingSubcatFor(null)
    setShowAddModal(false)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent, parentId: string | null) => {
    if (e.key === 'Enter') {
      addCategory(parentId)
    } else if (e.key === 'Escape') {
      setNewCategoryName('')
      setAddingSubcatFor(null)
      setShowAddModal(false)
    }
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false)

    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    const reordered = [...mainCategories]
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    // Update sort_order for all affected categories
    const updatedCategories = reordered.map((cat, index) => ({
      ...cat,
      sort_order: index,
    }))

    // Update local state immediately for optimistic UI
    setCategories(prev =>
      prev.map(cat => {
        const updated = updatedCategories.find(u => u.id === cat.id)
        return updated || cat
      })
    )

    // Persist to database
    try {
      await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryIds: updatedCategories.map(c => c.id),
        }),
      })
    } catch (error) {
      console.error('Failed to save category order:', error)
      // Revert on error
      setCategories(initialCategories)
    }
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <FolderOpen className="w-12 h-12 mb-4 text-zinc-700" />
        <p className="text-lg">No categories yet</p>
        <p className="text-sm mt-1">Click "Add Category" to create your first category</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Droppable droppableId="categories">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {mainCategories.map((mainCat, index) => {
              const subcategories = getSubcategories(mainCat.id)
              const bookmarkCount = getBookmarkCount(mainCat.id, true)

              return (
                <Draggable key={mainCat.id} draggableId={mainCat.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      data-category={mainCat.id}
                      className={`bg-zinc-900/50 border rounded-lg overflow-hidden transition-shadow ${
                        snapshot.isDragging
                          ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                          : 'border-zinc-800/50'
                      }`}
                    >
                      {/* Main Category Row */}
                      <div className="flex items-center gap-3 px-4 py-3 group">
                        <div
                          {...provided.dragHandleProps}
                          className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

              {editingId === mainCat.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <span className="flex-1 text-zinc-100 font-medium">{mainCat.name}</span>
              )}

              <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">
                {bookmarkCount}
              </span>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(mainCat)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(mainCat.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subcategories */}
            <div className="px-4 pb-3 ml-8">
              <div className="flex flex-wrap items-center gap-2">
                {subcategories.map(subcat => {
                  const subCount = getBookmarkCount(subcat.id, false)

                  return (
                    <div
                      key={subcat.id}
                      data-subcategory={subcat.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-sm group/sub"
                    >
                      {editingId === subcat.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={saveEdit}
                          className="w-24 bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-zinc-300">{subcat.name}</span>
                      )}
                      <span className="text-xs text-zinc-500">{subCount}</span>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity ml-1">
                        <button
                          onClick={() => startEdit(subcat)}
                          className="p-0.5 text-zinc-500 hover:text-zinc-300 rounded"
                          aria-label="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(subcat.id)}
                          className="p-0.5 text-zinc-500 hover:text-red-400 rounded"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {addingSubcatFor === mainCat.id ? (
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => handleAddKeyDown(e, mainCat.id)}
                    onBlur={() => {
                      if (newCategoryName.trim()) {
                        addCategory(mainCat.id)
                      } else {
                        setAddingSubcatFor(null)
                      }
                    }}
                    placeholder="Subcategory name..."
                    className="w-32 bg-zinc-700 border border-emerald-500 rounded px-2 py-1 text-zinc-100 text-xs focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setAddingSubcatFor(mainCat.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors"
                    aria-label="Add subcat"
                  >
                    <Plus className="w-3 h-3" />
                    Add subcat
                  </button>
                )}
              </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              Delete &quot;{getCategoryToDelete()?.name}&quot;?
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              {getBookmarkCount(deleteConfirmId, mainCategories.some(c => c.id === deleteConfirmId))} bookmarks will become uncategorized and need re-sorting.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors"
                aria-label="Confirm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Add New Category
            </h3>
            <input
              ref={addInputRef}
              type="text"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => handleAddKeyDown(e, null)}
              placeholder="Category name..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNewCategoryName('')
                  setShowAddModal(false)
                }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => addCategory(null)}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </DragDropContext>
  )
}
