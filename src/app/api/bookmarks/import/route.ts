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

    // Transform parsed bookmarks to database format
    const bookmarksToInsert: BookmarkInsert[] = bookmarks.map(
      (bookmark: ImportBookmark) => {
        // Handle both Date objects and ISO strings (from JSON serialization)
        let addDateIso: string | null = null
        if (bookmark.addDate) {
          if (typeof bookmark.addDate === 'string') {
            addDateIso = bookmark.addDate
          } else if (bookmark.addDate instanceof Date) {
            addDateIso = bookmark.addDate.toISOString()
          }
        }

        return {
          url: bookmark.url,
          title: bookmark.title,
          add_date: addDateIso,
          chrome_folder_path: bookmark.folderPath,
          domain: extractDomain(bookmark.url),
          is_tweet: bookmark.isTweet,
          is_keeper: bookmark.isKeeper,
          is_categorized: false,
          is_skipped: false,
        }
      }
    )

    // Upsert bookmarks (insert or update on conflict)
    const { data, error } = await supabase
      .from('bookmarks')
      .upsert(bookmarksToInsert, {
        onConflict: 'url',
      })
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
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
