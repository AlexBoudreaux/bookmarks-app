'use client'

import { Plus } from 'lucide-react'

export function AddCategoryButton() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('add-category'))
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-100 bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors"
    >
      <Plus className="w-4 h-4" />
      Add Category
    </button>
  )
}
