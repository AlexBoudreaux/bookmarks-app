import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // 1. Insert bookmark_categories junction records
    const junctionRecords = categoryIds.map((categoryId: string) => ({
      bookmark_id: bookmarkId,
      category_id: categoryId,
    }))

    const { error: insertError } = await supabase
      .from('bookmark_categories')
      .insert(junctionRecords)

    if (insertError) {
      console.error('Failed to insert bookmark_categories:', insertError)
      return NextResponse.json(
        { error: 'Failed to save categorization' },
        { status: 500 }
      )
    }

    // 2. Mark bookmark as categorized and clear is_skipped flag
    const { error: updateError } = await supabase
      .from('bookmarks')
      .update({
        is_categorized: true,
        is_skipped: false,
      })
      .eq('id', bookmarkId)

    if (updateError) {
      console.error('Failed to update bookmark:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark bookmark as categorized' },
        { status: 500 }
      )
    }

    // 3. Increment usage_count on selected categories
    const { error: rpcError } = await supabase.rpc('increment_usage_counts', {
      category_ids: categoryIds,
    })

    if (rpcError) {
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
