import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractDomain } from '@/lib/extract-domain'
import type { Database } from '@/types/database'

type BookmarkInsert = Database['public']['Tables']['bookmarks']['Insert']

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
    const { bookmarks } = body

    if (!bookmarks || !Array.isArray(bookmarks)) {
      return NextResponse.json(
        { error: 'Invalid request: bookmarks array required' },
        { status: 400 }
      )
    }

    // Deduplicate incoming bookmarks by URL
    const bookmarksMap = new Map<string, ImportBookmark>()
    for (const bookmark of bookmarks as ImportBookmark[]) {
      bookmarksMap.set(bookmark.url, bookmark)
    }
    const incomingUrls = Array.from(bookmarksMap.keys())

    // Check which URLs already exist in the database
    const { data: existingBookmarks, error: fetchError } = await supabase
      .from('bookmarks')
      .select('url')
      .in('url', incomingUrls)

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to check existing bookmarks', details: fetchError.message },
        { status: 500 }
      )
    }

    const existingUrls = new Set(existingBookmarks?.map(b => b.url) || [])

    // Only insert bookmarks that don't already exist
    const bookmarksToInsert: BookmarkInsert[] = []
    for (const [url, bookmark] of bookmarksMap) {
      if (existingUrls.has(url)) {
        continue // Skip existing bookmarks to preserve categorization
      }

      let addDateIso: string | null = null
      if (bookmark.addDate) {
        if (typeof bookmark.addDate === 'string') {
          addDateIso = bookmark.addDate
        } else if (bookmark.addDate instanceof Date) {
          addDateIso = bookmark.addDate.toISOString()
        }
      }

      bookmarksToInsert.push({
        url: bookmark.url,
        title: bookmark.title,
        add_date: addDateIso,
        chrome_folder_path: bookmark.folderPath,
        domain: extractDomain(bookmark.url),
        is_tweet: bookmark.isTweet,
        is_keeper: bookmark.isKeeper,
        is_categorized: false,
        is_skipped: false,
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
    const { data, error } = await supabase
      .from('bookmarks')
      .insert(bookmarksToInsert)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save bookmarks', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
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
