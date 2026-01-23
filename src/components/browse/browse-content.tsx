'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, Bookmark, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TweetCard } from './tweet-card'
import { BrowseLinkCard } from './browse-link-card'

const ITEMS_PER_PAGE = 12

interface Category {
  id: string
  name: string
  parent_id: string | null
  usage_count: number | null
  sort_order: number | null
  created_at: string | null
}

interface BookmarkData {
  id: string
  url: string
  title: string | null
  is_tweet: boolean | null
  is_categorized: boolean | null
  domain: string | null
  notes: string | null
  og_image: string | null
  add_date: string | null
}

interface BookmarkCategory {
  bookmark_id: string
  category_id: string
}

interface BrowseContentProps {
  categories: Category[]
  bookmarks: BookmarkData[]
  bookmarkCategories: BookmarkCategory[]
}

export function BrowseContent({ categories, bookmarks, bookmarkCategories }: BrowseContentProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)

  // Separate main categories from subcategories
  const mainCategories = useMemo(
    () => categories.filter(c => c.parent_id === null),
    [categories]
  )

  const getSubcategories = (parentId: string) =>
    categories.filter(c => c.parent_id === parentId)

  // Build a map of category ID -> set of bookmark IDs for efficient lookup
  const categoryToBookmarks = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const bc of bookmarkCategories) {
      if (!map.has(bc.category_id)) {
        map.set(bc.category_id, new Set())
      }
      map.get(bc.category_id)!.add(bc.bookmark_id)
    }
    return map
  }, [bookmarkCategories])

  // Calculate bookmark count for a category (including bookmarks in its subcategories for main categories)
  const getBookmarkCount = (categoryId: string, isMainCategory: boolean): number => {
    if (isMainCategory) {
      // For main categories, count bookmarks in main category AND all subcategories
      const subcats = getSubcategories(categoryId)
      const allCategoryIds = [categoryId, ...subcats.map(s => s.id)]
      const bookmarkIds = new Set<string>()
      for (const catId of allCategoryIds) {
        const bms = categoryToBookmarks.get(catId)
        if (bms) {
          for (const bmId of bms) {
            bookmarkIds.add(bmId)
          }
        }
      }
      return bookmarkIds.size
    } else {
      // For subcategories, count only direct bookmarks
      return categoryToBookmarks.get(categoryId)?.size || 0
    }
  }

  // Filter bookmarks based on selected category
  const filteredBookmarks = useMemo(() => {
    if (selectedCategoryId === null) {
      return bookmarks
    }

    const selectedCategory = categories.find(c => c.id === selectedCategoryId)
    const isMainCategory = selectedCategory?.parent_id === null

    if (isMainCategory) {
      // Include bookmarks from main category and all its subcategories
      const subcats = getSubcategories(selectedCategoryId)
      const allCategoryIds = [selectedCategoryId, ...subcats.map(s => s.id)]
      const bookmarkIds = new Set<string>()
      for (const catId of allCategoryIds) {
        const bms = categoryToBookmarks.get(catId)
        if (bms) {
          for (const bmId of bms) {
            bookmarkIds.add(bmId)
          }
        }
      }
      return bookmarks.filter(b => bookmarkIds.has(b.id))
    } else {
      // Subcategory: only show bookmarks directly in that subcategory
      const bookmarkIds = categoryToBookmarks.get(selectedCategoryId) || new Set()
      return bookmarks.filter(b => bookmarkIds.has(b.id))
    }
  }, [selectedCategoryId, bookmarks, categories, categoryToBookmarks])

  // Paginated bookmarks for display
  const displayedBookmarks = useMemo(
    () => filteredBookmarks.slice(0, displayCount),
    [filteredBookmarks, displayCount]
  )

  const hasMore = displayCount < filteredBookmarks.length

  const loadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
  }

  // Reset pagination when filter changes
  const handleCategoryClickWithReset = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId)
    setDisplayCount(ITEMS_PER_PAGE)
  }

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleCategoryClick = (categoryId: string | null) => {
    handleCategoryClickWithReset(categoryId)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <nav
        role="navigation"
        data-collapsed={sidebarCollapsed}
        className={cn(
          'flex flex-col border-r border-zinc-800/50 bg-zinc-950 transition-all duration-300',
          sidebarCollapsed ? 'w-14' : 'w-64'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800/50">
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Categories
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="toggle sidebar"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* All Bookmarks */}
          <button
            onClick={() => handleCategoryClick(null)}
            data-selected={selectedCategoryId === null}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
              selectedCategoryId === null
                ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                : 'text-zinc-300 hover:bg-zinc-800/50 border-l-2 border-transparent'
            )}
          >
            <Bookmark className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">All Bookmarks</span>
                <span className="text-xs text-zinc-500">{bookmarks.length}</span>
              </>
            )}
          </button>

          {/* Main Categories */}
          {mainCategories.map(category => {
            const subcategories = getSubcategories(category.id)
            const isExpanded = expandedCategories.has(category.id)
            const isSelected = selectedCategoryId === category.id

            return (
              <div key={category.id}>
                <div
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                      : 'text-zinc-300 hover:bg-zinc-800/50 border-l-2 border-transparent'
                  )}
                >
                  {/* Expand/Collapse Toggle */}
                  {subcategories.length > 0 && !sidebarCollapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCategoryExpanded(category.id)
                      }}
                      className="p-0.5 rounded hover:bg-zinc-700/50"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {(subcategories.length === 0 || sidebarCollapsed) && (
                    <div className="w-4" />
                  )}

                  <button
                    onClick={() => handleCategoryClick(category.id)}
                    data-selected={isSelected}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{category.name}</span>
                        <span className="text-xs text-zinc-500">
                          {getBookmarkCount(category.id, true)}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subcategories */}
                {isExpanded && !sidebarCollapsed && subcategories.length > 0 && (
                  <div className="ml-6 border-l border-zinc-800/50">
                    {subcategories.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => handleCategoryClick(sub.id)}
                        data-selected={selectedCategoryId === sub.id}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                          selectedCategoryId === sub.id
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                        )}
                      >
                        <span className="flex-1 text-left truncate">{sub.name}</span>
                        <span className="text-xs text-zinc-600">
                          {getBookmarkCount(sub.id, false)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search and Filters */}
        <div data-testid="filter-area" className="p-4 border-b border-zinc-800/50 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors">
              <Filter className="w-3 h-3" />
              Sort: Newest
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors">
              Type: All
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors">
              Domain
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors">
              Has Notes
            </button>
          </div>
        </div>

        {/* Bookmark Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            data-testid="bookmark-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredBookmarks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                  <Bookmark className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No bookmarks yet</h3>
                <p className="text-sm text-zinc-500 max-w-md">
                  Import your Chrome bookmarks to get started, then categorize them to see them here.
                </p>
              </div>
            ) : (
              displayedBookmarks.map(bookmark => (
                <article
                  key={bookmark.id}
                  className="group relative rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/30 hover:border-zinc-700/50 transition-all overflow-hidden"
                >
                  {bookmark.is_tweet ? (
                    <TweetCard url={bookmark.url} title={bookmark.title} />
                  ) : (
                    <BrowseLinkCard
                      url={bookmark.url}
                      title={bookmark.title}
                      domain={bookmark.domain}
                      notes={bookmark.notes}
                      ogImage={bookmark.og_image}
                    />
                  )}
                </article>
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-8 pb-4">
              <button
                onClick={loadMore}
                data-testid="load-more-button"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 transition-colors text-sm font-medium"
              >
                <Loader2 className="w-4 h-4" />
                Load more ({filteredBookmarks.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
