'use client'

import { CategoryPicker } from './category-picker'
import { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategorizeWrapperProps {
  categories: Category[]
}

export function CategorizeWrapper({ categories }: CategorizeWrapperProps) {
  const handleSelectCategory = (category: Category) => {
    console.log('Selected category:', category.name)
  }

  return (
    <CategoryPicker
      categories={categories}
      onSelect={handleSelectCategory}
    />
  )
}
