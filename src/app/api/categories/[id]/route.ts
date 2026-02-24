import { NextResponse } from 'next/server'
import { db } from '@/db'
import { categories, bookmarkCategories, type Category } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

    const result = await db
      .update(categories)
      .set({ name })
      .where(eq(categories.id, id))
      .returning() as Category[]
    const category = result[0]

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
    await db
      .delete(categories)
      .where(eq(categories.parentId, id))

    // Delete bookmark_categories entries for this category
    await db
      .delete(bookmarkCategories)
      .where(eq(bookmarkCategories.categoryId, id))

    // Delete the category itself
    await db
      .delete(categories)
      .where(eq(categories.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
