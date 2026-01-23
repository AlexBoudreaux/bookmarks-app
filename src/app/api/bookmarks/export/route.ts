import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { exportToChrome } from '@/lib/export-bookmarks'

export async function GET() {
  // Fetch keeper bookmarks only
  const { data: keepers, error } = await supabase
    .from('bookmarks')
    .select('url, title, add_date, chrome_folder_path')
    .eq('is_keeper', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 })
  }

  // Generate Chrome bookmark HTML
  const html = exportToChrome(keepers || [])

  // Return as downloadable HTML file
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bookmarks.html"',
    },
  })
}
