import { NextResponse } from 'next/server'
import { db } from '@/db'
import { bookmarks, type NewBookmark } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { extractDomain } from '@/lib/extract-domain'

interface ImportBookmark {
  url: string
  title: string
  addDate: Date | string | null
  folderPath: string
  isTweet: boolean
  isKeeper: boolean
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookmarks: incoming } = body

    if (!incoming || !Array.isArray(incoming)) {
      return NextResponse.json(
        { error: 'Invalid request: bookmarks array required' },
        { status: 400 }
      )
    }

    // Deduplicate incoming bookmarks by URL
    const bookmarksMap = new Map<string, ImportBookmark>()
    for (const bookmark of incoming as ImportBookmark[]) {
      bookmarksMap.set(bookmark.url, bookmark)
    }
    const incomingUrls = Array.from(bookmarksMap.keys())

    // Check which URLs already exist in the database
    const existingBookmarks = await db
      .select({ url: bookmarks.url })
      .from(bookmarks)
      .where(inArray(bookmarks.url, incomingUrls))

    const existingUrls = new Set(existingBookmarks.map(b => b.url))

    // Only insert bookmarks that don't already exist
    const bookmarksToInsert: NewBookmark[] = []
    for (const [url, bookmark] of bookmarksMap) {
      if (existingUrls.has(url)) {
        continue // Skip existing bookmarks to preserve categorization
      }

      let addDateValue: Date | null = null
      if (bookmark.addDate) {
        if (typeof bookmark.addDate === 'string') {
          addDateValue = new Date(bookmark.addDate)
        } else if (bookmark.addDate instanceof Date) {
          addDateValue = bookmark.addDate
        }
      }

      bookmarksToInsert.push({
        url: bookmark.url,
        title: bookmark.title,
        addDate: addDateValue,
        chromeFolderPath: bookmark.folderPath,
        domain: extractDomain(bookmark.url),
        isTweet: bookmark.isTweet,
        isKeeper: bookmark.isKeeper,
        isCategorized: false,
        isSkipped: false,
      })
    }

    if (bookmarksToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: existingUrls.size,
        message: 'All bookmarks already exist in database',
      })
    }

    // Insert only new bookmarks
    const inserted = await db
      .insert(bookmarks)
      .values(bookmarksToInsert)
      .returning()

    return NextResponse.json({
      success: true,
      imported: inserted.length,
      skipped: existingUrls.size,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
