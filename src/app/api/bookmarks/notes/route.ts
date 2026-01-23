import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { bookmarkId, notes } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('bookmarks')
      .update({ notes: notes ?? null })
      .eq('id', bookmarkId)

    if (error) {
      console.error('Failed to update notes:', error)
      return NextResponse.json(
        { error: 'Failed to update notes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in notes route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
