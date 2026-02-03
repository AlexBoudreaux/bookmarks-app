import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Dropzone } from '@/components/import/dropzone'
import { supabase } from '@/lib/supabase'

// Disable Next.js caching so counts are fresh
export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  // Check counts for context
  const { count: uncategorizedCount } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('is_categorized', false)
    .eq('is_keeper', false)
    .eq('is_skipped', false)
    .not('chrome_folder_path', 'eq', 'Archived Bookmarks')

  const { count: categorizedCount } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('is_categorized', true)

  const hasUncategorized = (uncategorizedCount ?? 0) > 0
  const hasCategorized = (categorizedCount ?? 0) > 0

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link
            href={hasUncategorized ? '/categorize' : '/browse'}
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {hasUncategorized ? 'Back to Categorize' : 'Back to Browse'}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Import</h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main content */}
      <main className="flex min-h-screen items-center justify-center px-6 pt-16">
        <div className="w-full max-w-2xl py-16">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {hasCategorized ? 'Import More Bookmarks' : 'Import Your Bookmarks'}
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              Drop your Chrome bookmarks file to add more
            </p>
            {hasUncategorized && (
              <p className="mt-2 text-sm text-emerald-500">
                {uncategorizedCount} bookmarks waiting to be categorized
              </p>
            )}
          </div>

          <Dropzone />
        </div>
      </main>
    </div>
  )
}
