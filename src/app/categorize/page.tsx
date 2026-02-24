import Link from 'next/link'
import { Upload } from 'lucide-react'
import { db } from '@/db'
import { bookmarks, categories, type Bookmark, type Category } from '@/db/schema'
import { and, eq, ne, asc, desc } from 'drizzle-orm'
import { CategorizeWrapper } from '@/components/categorize/categorize-wrapper'

// Disable Next.js caching so bookmark data is always fresh
export const dynamic = 'force-dynamic'

export default async function CategorizePage() {
  // Fetch all uncategorized bookmarks (no pagination needed, Drizzle has no row limit)
  const uncategorized = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.isCategorized, false),
        eq(bookmarks.isKeeper, false),
        eq(bookmarks.isSkipped, false),
        ne(bookmarks.chromeFolderPath, 'Archived Bookmarks')
      )
    )
    .orderBy(asc(bookmarks.addDate)) as Bookmark[]

  // Fetch all categories (main and sub)
  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(desc(categories.usageCount)) as Category[]

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Link
              href="/browse"
              className="text-zinc-400 hover:text-zinc-100 transition-colors text-xs font-medium"
            >
              ← Browse
            </Link>
            <h1 className="text-xs font-medium text-zinc-200">
              Categorize
            </h1>
            <Link
              href="/import"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors text-xs font-medium"
            >
              <Upload className="h-3 w-3" />
              Import
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - fills remaining space */}
      <main className="flex-1 overflow-hidden py-4">
        <div className="max-w-6xl mx-auto px-4 h-full">
          <CategorizeWrapper
            categories={allCategories}
            bookmarks={uncategorized}
          />
        </div>
      </main>
    </div>
  )
}
