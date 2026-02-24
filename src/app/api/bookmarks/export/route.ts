import { NextResponse } from 'next/server'
import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { exportToChrome } from '@/lib/export-bookmarks'

export async function GET() {
  // Fetch keeper bookmarks only
  const keepers = await db
    .select({
      url: bookmarks.url,
      title: bookmarks.title,
      add_date: bookmarks.addDate,
      chrome_folder_path: bookmarks.chromeFolderPath,
    })
    .from(bookmarks)
    .where(eq(bookmarks.isKeeper, true))

  // Generate Chrome bookmark HTML
  // Convert Date objects to ISO strings for export-bookmarks compatibility
  const html = exportToChrome(
    keepers.map((k) => ({
      ...k,
      add_date: k.add_date?.toISOString() ?? null,
    }))
  )

  // Return as downloadable HTML file
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bookmarks.html"',
    },
  })
}
