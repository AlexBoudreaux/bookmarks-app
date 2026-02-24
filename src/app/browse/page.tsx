import Link from 'next/link'
import { db } from '@/db'
import { bookmarks, categories, bookmarkCategories, type Bookmark, type Category, type BookmarkCategory } from '@/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { BrowseContent } from '@/components/browse/browse-content'
import { ExportButton } from '@/components/browse/export-button'

export const dynamic = 'force-dynamic'

export default async function BrowsePage() {
  // Fetch categorized bookmarks (not keepers, not skipped)
  const allBookmarks = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.isCategorized, true),
        eq(bookmarks.isKeeper, false),
        eq(bookmarks.isSkipped, false)
      )
    )
    .orderBy(desc(bookmarks.addDate)) as Bookmark[]

  // Fetch all categories (main and sub)
  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(desc(categories.usageCount)) as Category[]

  // Fetch bookmark_categories junction table for filtering
  const allBookmarkCategories = await db
    .select({
      bookmarkId: bookmarkCategories.bookmarkId,
      categoryId: bookmarkCategories.categoryId,
    })
    .from(bookmarkCategories) as BookmarkCategory[]

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
            <ExportButton />
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
          categories={allCategories}
          bookmarks={allBookmarks}
          bookmarkCategories={allBookmarkCategories}
        />
      </main>
    </div>
  )
}
