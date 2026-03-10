import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bookmarks, bookmarkCategories, categories } from '@/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { bookmarkId } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId is required' },
        { status: 400 }
      )
    }

    // Decrement usage_count for any categories this bookmark was in
    try {
      const junctions = await db
        .select({ categoryId: bookmarkCategories.categoryId })
        .from(bookmarkCategories)
        .where(eq(bookmarkCategories.bookmarkId, bookmarkId))

      const catIds = junctions.map(j => j.categoryId)
      if (catIds.length > 0) {
        await db
          .update(categories)
          .set({ usageCount: sql`GREATEST(COALESCE(${categories.usageCount}, 0) - 1, 0)` })
          .where(inArray(categories.id, catIds))
      }
    } catch (rpcError) {
      console.error('Failed to decrement usage counts:', rpcError)
    }

    await db
      .update(bookmarks)
      .set({ isSkipped: true })
      .where(eq(bookmarks.id, bookmarkId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in skip bookmark route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
