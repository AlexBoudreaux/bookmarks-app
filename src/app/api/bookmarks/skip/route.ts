import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { bookmarkId } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('bookmarks')
      .update({ is_skipped: true })
      .eq('id', bookmarkId)

    if (error) {
      console.error('Failed to skip bookmark:', error)
      return NextResponse.json(
        { error: 'Failed to skip bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in skip bookmark route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
