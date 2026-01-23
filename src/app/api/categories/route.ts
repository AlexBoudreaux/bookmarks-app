import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface CreateCategoryRequest {
  name: string
  parent_id?: string
}

export async function POST(request: Request) {
  try {
    const body: CreateCategoryRequest = await request.json()

    // Validate name
    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Build insert object
    const insertData: { name: string; parent_id?: string } = { name }
    if (body.parent_id) {
      insertData.parent_id = body.parent_id
    }

    // Insert into database
    const { data: category, error } = await supabase
      .from('categories')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create category:', error)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
