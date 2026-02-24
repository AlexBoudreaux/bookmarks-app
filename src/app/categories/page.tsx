import Link from 'next/link'
import { db } from '@/db'
import { categories, bookmarkCategories, type Category, type BookmarkCategory } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { CategoriesContent } from '@/components/categories/categories-content'
import { AddCategoryButton } from '@/components/categories/add-category-button'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  // Fetch all categories
  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder)) as Category[]

  // Fetch bookmark counts per category
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
              href="/browse"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Manage Categories
            </h1>
          </div>
          <AddCategoryButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-zinc-500 mb-6">
            Drag to reorder. Most-used categories appear first in keyboard shortcuts (1-9, 0).
          </p>

          <CategoriesContent
            categories={allCategories}
            bookmarkCategories={allBookmarkCategories}
          />

          <p className="text-xs text-zinc-600 mt-8">
            Note: Deleting a category does not delete bookmarks. Bookmarks will become uncategorized and need re-sorting.
          </p>
        </div>
      </main>
    </div>
  )
}
