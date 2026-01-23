import { NextRequest, NextResponse } from 'next/server'
import { searchBookmarks } from '@/lib/search-bookmarks'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  const { data, error } = await searchBookmarks(query)

  if (error) {
    return NextResponse.json(
      { data: null, error: 'Search failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}
