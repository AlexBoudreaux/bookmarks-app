import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CategorizeWrapper } from '@/components/categorize/categorize-wrapper'
import { Database } from '@/types/database'

// Disable Next.js caching so bookmark data is always fresh
export const dynamic = 'force-dynamic'

type Bookmark = Database['public']['Tables']['bookmarks']['Row']

// Fetch all bookmarks using pagination to bypass Supabase's 1000 row limit
async function fetchAllBookmarks(): Promise<Bookmark[]> {
  const PAGE_SIZE = 1000
  const allBookmarks: Bookmark[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('is_categorized', false)
      .eq('is_keeper', false)
      .eq('is_skipped', false)
      .not('chrome_folder_path', 'eq', 'Archived Bookmarks')
      .order('add_date', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error('Error fetching bookmarks:', error)
      break
    }

    if (data && data.length > 0) {
      allBookmarks.push(...data)
      hasMore = data.length === PAGE_SIZE
      page++
    } else {
      hasMore = false
    }
  }

  return allBookmarks
}

export default async function CategorizePage() {
  // Fetch all uncategorized bookmarks using pagination
  const bookmarks = await fetchAllBookmarks()

  // Fetch all categories (main and sub)
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('usage_count', { ascending: false })

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-zinc-400 hover:text-zinc-100 transition-colors text-xs font-medium"
            >
              ← Back
            </Link>
            <h1 className="text-xs font-medium text-zinc-200">
              Categorize
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content - fills remaining space */}
      <main className="flex-1 overflow-hidden py-4">
        <div className="max-w-6xl mx-auto px-4 h-full">
          <CategorizeWrapper
            categories={categories || []}
            bookmarks={bookmarks || []}
          />
        </div>
      </main>
    </div>
  )
}
