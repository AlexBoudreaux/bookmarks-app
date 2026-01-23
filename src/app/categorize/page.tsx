import { supabase } from '@/lib/supabase'
import { CategorizeWrapper } from '@/components/categorize/categorize-wrapper'

export default async function CategorizePage() {
  // Fetch uncategorized bookmarks count
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('is_categorized', false)
    .eq('is_keeper', false)
    .eq('is_skipped', false)
    .order('add_date', { ascending: true })

  // Fetch main categories (parent_id IS NULL)
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('usage_count', { ascending: false })

  const totalCount = bookmarks?.length || 0
  const currentIndex = 0 // Will be dynamic later

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Fixed Header with Progress */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <button className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium">
              ← Back
            </button>
            <div className="text-sm font-mono">
              <span className="text-zinc-400">{currentIndex + 1}</span>
              <span className="text-zinc-600 mx-2">of</span>
              <span className="text-zinc-400">{totalCount}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1 bg-zinc-900/50 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
              style={{ width: totalCount > 0 ? `${((currentIndex + 1) / totalCount) * 100}%` : '0%' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-32">
        <div className="max-w-5xl mx-auto px-6">
          {/* Bookmark Preview Area */}
          <div className="mb-8">
            <div className="relative group">
              {/* Decorative background glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-12 min-h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-800/50 mb-6">
                    <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-zinc-400 mb-2">Bookmark Preview</h3>
                  <p className="text-sm text-zinc-600">Tweet embeds and link cards will appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Picker */}
          <div className="relative">
            <CategorizeWrapper categories={categories || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
