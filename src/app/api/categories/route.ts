import { NextResponse } from 'next/server'
import { db } from '@/db'
import { categories, type Category } from '@/db/schema'

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
    const insertData: { name: string; parentId?: string } = { name }
    if (body.parent_id) {
      insertData.parentId = body.parent_id
    }

    // Insert into database
    const result = await db
      .insert(categories)
      .values(insertData)
      .returning() as Category[]
    const category = result[0]

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
