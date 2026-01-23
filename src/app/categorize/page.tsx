import { supabase } from '@/lib/supabase'
import { CategorizeWrapper } from '@/components/categorize/categorize-wrapper'
import { TweetPreview } from '@/components/categorize/tweet-preview'

export default async function CategorizePage() {
  // Fetch uncategorized bookmarks with full data
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('*')
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
  const currentBookmark = bookmarks?.[currentIndex]

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

              <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-12">
                {currentBookmark && currentBookmark.is_tweet ? (
                  <TweetPreview url={currentBookmark.url} />
                ) : currentBookmark ? (
                  <div className="text-center min-h-[500px] flex items-center justify-center">
                    <div>
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-800/50 mb-6">
                        <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium text-zinc-300 mb-2">{currentBookmark.title}</h3>
                      <a
                        href={currentBookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        {currentBookmark.url}
                      </a>
                      <p className="text-sm text-zinc-600 mt-4">Link card preview (CAT-005)</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center min-h-[500px] flex items-center justify-center">
                    <div>
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-800/50 mb-6">
                        <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium text-zinc-400 mb-2">No bookmarks to categorize</h3>
                      <p className="text-sm text-zinc-600">Import bookmarks to get started</p>
                    </div>
                  </div>
                )}
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
