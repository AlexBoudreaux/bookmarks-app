import { NextRequest, NextResponse } from 'next/server'
import { searchBookmarks } from '@/lib/search-bookmarks'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ data: [], error: null })
  }

  try {
    const data = await searchBookmarks(query)
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Search failed' },
      { status: 500 }
    )
  }
}
