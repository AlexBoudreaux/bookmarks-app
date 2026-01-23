import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BrowseContent } from '@/components/browse/browse-content'

export default async function BrowsePage() {
  // Fetch categorized bookmarks (not keepers, not skipped)
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('is_categorized', true)
    .eq('is_keeper', false)
    .eq('is_skipped', false)
    .order('add_date', { ascending: false })

  // Fetch all categories (main and sub)
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('usage_count', { ascending: false })

  // Fetch bookmark_categories junction table for filtering
  const { data: bookmarkCategories } = await supabase
    .from('bookmark_categories')
    .select('bookmark_id, category_id')

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Bookmarks
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/categories"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Manage Categories
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14">
        <BrowseContent
          categories={categories || []}
          bookmarks={bookmarks || []}
          bookmarkCategories={bookmarkCategories || []}
        />
      </main>
    </div>
  )
}
