import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { bookmarkId, notes } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId is required' },
        { status: 400 }
      )
    }

    await db
      .update(bookmarks)
      .set({ notes: notes ?? null })
      .where(eq(bookmarks.id, bookmarkId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in notes route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
