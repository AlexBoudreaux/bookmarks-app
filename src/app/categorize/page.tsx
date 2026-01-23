import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CategorizeWrapper } from '@/components/categorize/categorize-wrapper'

interface PositionValue {
  index: number
}

export default async function CategorizePage() {
  // Fetch uncategorized bookmarks with full data
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('is_categorized', false)
    .eq('is_keeper', false)
    .eq('is_skipped', false)
    .order('add_date', { ascending: true })

  // Fetch all categories (main and sub)
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('usage_count', { ascending: false })

  // Fetch saved position from settings
  const { data: positionData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'categorize_position')
    .single()

  const savedPosition = (positionData?.value as PositionValue | null)?.index ?? 0
  const totalCount = bookmarks?.length || 0

  // Ensure saved position doesn't exceed bookmark count
  const initialIndex = Math.min(savedPosition, Math.max(0, totalCount - 1))

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Fixed Header with Progress */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/"
              className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium"
            >
              ← Back
            </Link>
            <h1 className="text-sm font-medium text-zinc-200">
              Categorize Bookmarks
            </h1>
            {/* Spacer for centering */}
            <div className="w-12" />
          </div>

          {/* Progress Bar - now managed by CategorizeWrapper */}
          <div className="relative h-1 bg-zinc-900/50 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
              style={{ width: '0%' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-8">
        <div className="max-w-5xl mx-auto px-6">
          <CategorizeWrapper
            categories={categories || []}
            bookmarks={bookmarks || []}
            initialIndex={initialIndex}
          />
        </div>
      </main>
    </div>
  )
}
