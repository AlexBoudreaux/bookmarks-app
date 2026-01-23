'use client'

import { useState } from 'react'
import { CategoryPicker } from './category-picker'
import { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategorizeWrapperProps {
  categories: Category[]
}

export function CategorizeWrapper({ categories }: CategorizeWrapperProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()

  const handleSelectCategory = (category: Category) => {
    setSelectedCategoryId(category.id)
    console.log('Selected category:', category.name)
    // TODO: Navigate to subcategory picker
  }

  return (
    <CategoryPicker
      categories={categories}
      onSelect={handleSelectCategory}
      selectedId={selectedCategoryId}
    />
  )
}
