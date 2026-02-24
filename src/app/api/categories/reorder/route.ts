import { NextResponse } from 'next/server'
import { db } from '@/db'
import { categories } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
    await Promise.all(
      categoryIds.map((id: string, index: number) =>
        db
          .update(categories)
          .set({ sortOrder: index })
          .where(eq(categories.id, id))
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering categories:', error)
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    )
  }
}
