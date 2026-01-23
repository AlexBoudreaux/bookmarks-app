import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { categoryIds } = await request.json()

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'categoryIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Update each category's sort_order based on its position in the array
    const updates = categoryIds.map((id: string, index: number) =>
      supabase
        .from('categories')
        .update({ sort_order: index })
        .eq('id', id)
    )

    const results = await Promise.all(updates)

    // Check if any updates failed
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Failed to update some categories:', errors)
      return NextResponse.json(
        { error: 'Failed to update category order' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering categories:', error)
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    )
  }
}
