import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SETTINGS_KEY = 'categorize_position'

interface PositionValue {
  index: number
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single()

    if (error) {
      // PGRST116 means "Row not found", return default position
      if (error.code === 'PGRST116') {
        return NextResponse.json({ index: 0 })
      }
      console.error('Failed to load position:', error)
      return NextResponse.json(
        { error: 'Failed to load position' },
        { status: 500 }
      )
    }

    const value = data?.value as PositionValue | null
    return NextResponse.json({ index: value?.index ?? 0 })
  } catch (error) {
    console.error('Error in get position route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { index } = await request.json()

    if (index === undefined || index === null) {
      return NextResponse.json(
        { error: 'index is required' },
        { status: 400 }
      )
    }

    if (typeof index !== 'number' || index < 0) {
      return NextResponse.json(
        { error: 'index must be a non-negative number' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          key: SETTINGS_KEY,
          value: { index },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (error) {
      console.error('Failed to save position:', error)
      return NextResponse.json(
        { error: 'Failed to save position' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in save position route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
