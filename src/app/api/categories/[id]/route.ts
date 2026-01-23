import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update category:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // First delete any subcategories
    const { error: subError } = await supabase
      .from('categories')
      .delete()
      .eq('parent_id', id)

    if (subError) {
      console.error('Failed to delete subcategories:', subError)
    }

    // Delete bookmark_categories entries for this category
    const { error: junctionError } = await supabase
      .from('bookmark_categories')
      .delete()
      .eq('category_id', id)

    if (junctionError) {
      console.error('Failed to delete bookmark_categories:', junctionError)
    }

    // Delete the category itself
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete category:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
