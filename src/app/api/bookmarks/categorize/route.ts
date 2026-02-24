import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bookmarks, bookmarkCategories, categories } from '@/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { bookmarkId, categoryIds } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId is required' },
        { status: 400 }
      )
    }

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'categoryIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // 1. Delete existing bookmark_categories for this bookmark (idempotent for re-categorization)
    await db
      .delete(bookmarkCategories)
      .where(eq(bookmarkCategories.bookmarkId, bookmarkId))

    // 2. Insert new bookmark_categories junction records (dedupe in case same main category used twice)
    const uniqueCategoryIds = [...new Set(categoryIds as string[])]
    const junctionRecords = uniqueCategoryIds.map((categoryId: string) => ({
      bookmarkId,
      categoryId,
    }))

    await db.insert(bookmarkCategories).values(junctionRecords)

    // 3. Mark bookmark as categorized and clear is_skipped flag
    await db
      .update(bookmarks)
      .set({ isCategorized: true, isSkipped: false })
      .where(eq(bookmarks.id, bookmarkId))

    // 4. Increment usage_count on selected categories
    try {
      await db
        .update(categories)
        .set({ usageCount: sql`COALESCE(${categories.usageCount}, 0) + 1` })
        .where(inArray(categories.id, uniqueCategoryIds))
    } catch (rpcError) {
      // Log but don't fail the request since categorization was successful
      console.error('Failed to increment usage counts:', rpcError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in categorize bookmark route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
