import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

const SETTINGS_KEY = 'categorize_position'

interface PositionValue {
  index: number
}

export async function GET() {
  try {
    const rows = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
    const row = rows[0]

    if (!row) {
      return NextResponse.json({ index: 0 })
    }

    const value = row.value as PositionValue | null
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

    await db
      .insert(settings)
      .values({
        key: SETTINGS_KEY,
        value: { index },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: { index },
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in save position route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
