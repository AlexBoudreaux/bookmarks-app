import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { bookmarkId } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId is required' },
        { status: 400 }
      )
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
