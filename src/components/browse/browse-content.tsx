'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, Bookmark, Filter, Loader2, X, ChevronUp, StickyNote, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TweetCard } from './tweet-card'
import { BrowseLinkCard } from './browse-link-card'
import { useDebounce } from '@/hooks/use-debounce'

const ITEMS_PER_PAGE = 24
const SEARCH_DEBOUNCE_MS = 300
const LOAD_MORE_THRESHOLD = 200 // pixels from bottom to trigger load

type SortOption = 'newest' | 'oldest' | 'recently_viewed'
type TypeFilter = 'all' | 'tweet' | 'non-tweet'

interface Category {
  id: string
  name: string
  parentId: string | null
  usageCount: number | null
  sortOrder: number | null
  createdAt: Date | null
}

interface BookmarkData {
  id: string
  url: string
  title: string | null
  isTweet: boolean | null
  isCategorized: boolean | null
  domain: string | null
  notes: string | null
  ogImage: string | null
  addDate: Date | null
}

interface BookmarkCategory {
  bookmarkId: string
  categoryId: string
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
  const [searchResults, setSearchResults] = useState<BookmarkData[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Filter states
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [hasNotesFilter, setHasNotesFilter] = useState(false)

  // Dropdown open states
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false)

  // Refs for dropdown click outside handling
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const domainDropdownRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeDropdownOpen(false)
      }
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
        setDomainDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get unique domains from bookmarks
  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>()
    for (const b of bookmarks) {
      if (b.domain) domains.add(b.domain)
    }
    return Array.from(domains).sort()
  }, [bookmarks])

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)

  // Fetch search results when debounced query changes
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/bookmarks/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const { data } = await response.json()
        setSearchResults(data)
      }
    } catch {
      // Handle error silently, show original bookmarks
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    performSearch(debouncedSearchQuery)
  }, [debouncedSearchQuery, performSearch])

  // Reset pagination when search query changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [debouncedSearchQuery])

  // Separate main categories from subcategories
  const mainCategories = useMemo(
    () => categories.filter(c => c.parentId === null),
    [categories]
  )

  const getSubcategories = (parentId: string) =>
    categories.filter(c => c.parentId === parentId)

  // Build a map of category ID -> set of bookmark IDs for efficient lookup
  const categoryToBookmarks = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const bc of bookmarkCategories) {
      if (!map.has(bc.categoryId)) {
        map.set(bc.categoryId, new Set())
      }
      map.get(bc.categoryId)!.add(bc.bookmarkId)
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

  // Filter bookmarks based on selected category, search, and other filters
  const filteredBookmarks = useMemo(() => {
    // Start with either search results or all bookmarks
    let result: BookmarkData[]

    if (searchResults !== null) {
      result = searchResults
    } else if (selectedCategoryId === null) {
      result = bookmarks
    } else {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId)
      const isMainCategory = selectedCategory?.parentId === null

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
        result = bookmarks.filter(b => bookmarkIds.has(b.id))
      } else {
        // Subcategory: only show bookmarks directly in that subcategory
        const bookmarkIds = categoryToBookmarks.get(selectedCategoryId) || new Set()
        result = bookmarks.filter(b => bookmarkIds.has(b.id))
      }
    }

    // Apply type filter
    if (typeFilter === 'tweet') {
      result = result.filter(b => b.isTweet === true)
    } else if (typeFilter === 'non-tweet') {
      result = result.filter(b => b.isTweet !== true)
    }

    // Apply domain filter
    if (selectedDomains.size > 0) {
      result = result.filter(b => b.domain && selectedDomains.has(b.domain))
    }

    // Apply has notes filter
    if (hasNotesFilter) {
      result = result.filter(b => b.notes && b.notes.trim() !== '')
    }

    // Apply sorting
    const sorted = [...result]
    if (sortOption === 'newest') {
      sorted.sort((a, b) => {
        const dateA = a.addDate ? new Date(a.addDate).getTime() : 0
        const dateB = b.addDate ? new Date(b.addDate).getTime() : 0
        return dateB - dateA
      })
    } else if (sortOption === 'oldest') {
      sorted.sort((a, b) => {
        const dateA = a.addDate ? new Date(a.addDate).getTime() : 0
        const dateB = b.addDate ? new Date(b.addDate).getTime() : 0
        return dateA - dateB
      })
    }
    // 'recently_viewed' would need lastViewedAt field tracking, leaving as-is for now
    return sorted
  }, [selectedCategoryId, bookmarks, categories, categoryToBookmarks, searchResults, typeFilter, selectedDomains, hasNotesFilter, sortOption])

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

  // Reset pagination when any filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [typeFilter, selectedDomains, hasNotesFilter, sortOption])

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayCount(prev => prev + ITEMS_PER_PAGE)
        }
      },
      { threshold: 0, rootMargin: `${LOAD_MORE_THRESHOLD}px` }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore])

  // Filter handlers
  const handleSortChange = (option: SortOption) => {
    setSortOption(option)
    setSortDropdownOpen(false)
  }

  const handleTypeChange = (type: TypeFilter) => {
    setTypeFilter(type)
    setTypeDropdownOpen(false)
  }

  const handleDomainToggle = (domain: string) => {
    setSelectedDomains(prev => {
      const next = new Set(prev)
      if (next.has(domain)) {
        next.delete(domain)
      } else {
        next.add(domain)
      }
      return next
    })
    // Keep dropdown open for multi-select
  }

  const handleHasNotesToggle = () => {
    setHasNotesFilter(prev => !prev)
  }

  // Remove a specific filter
  const removeFilter = (filterType: 'type' | 'domain' | 'hasNotes', value?: string) => {
    if (filterType === 'type') {
      setTypeFilter('all')
    } else if (filterType === 'domain' && value) {
      setSelectedDomains(prev => {
        const next = new Set(prev)
        next.delete(value)
        return next
      })
    } else if (filterType === 'hasNotes') {
      setHasNotesFilter(false)
    }
  }

  // Active filters for displaying chips
  const activeFilters = useMemo(() => {
    const filters: { type: 'type' | 'domain' | 'hasNotes'; label: string; value?: string }[] = []

    if (typeFilter !== 'all') {
      filters.push({ type: 'type', label: typeFilter === 'tweet' ? 'Tweet' : 'Non-tweet' })
    }

    for (const domain of selectedDomains) {
      filters.push({ type: 'domain', label: domain, value: domain })
    }

    if (hasNotesFilter) {
      filters.push({ type: 'hasNotes', label: 'Has Notes' })
    }

    return filters
  }, [typeFilter, selectedDomains, hasNotesFilter])

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
              className="w-full pl-10 pr-10 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
            />
            {isSearching && (
              <div data-testid="search-loading" className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <div ref={sortDropdownRef} className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                aria-label="Sort"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
                )}
              >
                <Filter className="w-3 h-3" />
                Sort: {sortOption === 'newest' ? 'Newest' : sortOption === 'oldest' ? 'Oldest' : 'Recently viewed'}
                {sortDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {sortDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                  <button
                    role="option"
                    aria-label="Newest"
                    onClick={() => handleSortChange('newest')}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                      sortOption === 'newest' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    Newest
                    {sortOption === 'newest' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    role="option"
                    aria-label="Oldest"
                    onClick={() => handleSortChange('oldest')}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                      sortOption === 'oldest' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    Oldest
                    {sortOption === 'oldest' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    role="option"
                    aria-label="Recently viewed"
                    onClick={() => handleSortChange('recently_viewed')}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                      sortOption === 'recently_viewed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    Recently viewed
                    {sortOption === 'recently_viewed' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Type Dropdown */}
            <div ref={typeDropdownRef} className="relative">
              <button
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                aria-label="Type"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  typeFilter !== 'all'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
                )}
              >
                Type: {typeFilter === 'all' ? 'All' : typeFilter === 'tweet' ? 'Tweet' : 'Non-tweet'}
                {typeDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {typeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                  <button
                    role="option"
                    aria-label="All"
                    onClick={() => handleTypeChange('all')}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                      typeFilter === 'all' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    All
                    {typeFilter === 'all' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    role="option"
                    aria-label="Tweet"
                    onClick={() => handleTypeChange('tweet')}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                      typeFilter === 'tweet' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    Tweet
                    {typeFilter === 'tweet' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    role="option"
                    aria-label="Non-tweet"
                    onClick={() => handleTypeChange('non-tweet')}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                      typeFilter === 'non-tweet' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    Non-tweet
                    {typeFilter === 'non-tweet' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Domain Dropdown */}
            <div ref={domainDropdownRef} className="relative">
              <button
                onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
                aria-label="Domain"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  selectedDomains.size > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
                )}
              >
                Domain{selectedDomains.size > 0 ? ` (${selectedDomains.size})` : ''}
                {domainDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {domainDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                  {uniqueDomains.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-zinc-500">No domains</div>
                  ) : (
                    uniqueDomains.map(domain => (
                      <button
                        key={domain}
                        role="option"
                        aria-label={domain}
                        onClick={() => handleDomainToggle(domain)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-xs flex items-center justify-between',
                          selectedDomains.has(domain) ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800'
                        )}
                      >
                        <span className="truncate">{domain}</span>
                        {selectedDomains.has(domain) && <Check className="w-3 h-3 flex-shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Has Notes Toggle */}
            <button
              onClick={handleHasNotesToggle}
              aria-label="Has Notes"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                hasNotesFilter
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
              )}
            >
              <StickyNote className="w-3 h-3" />
              Has Notes
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <span className="text-xs text-zinc-500">Active:</span>
              {activeFilters.map((filter, index) => (
                <span
                  key={`${filter.type}-${filter.value || index}`}
                  data-testid="active-filter-chip"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                >
                  {filter.label}
                  <button
                    data-testid="remove-filter-button"
                    onClick={() => removeFilter(filter.type, filter.value)}
                    className="hover:text-emerald-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bookmark Masonry Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Bookmark className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No bookmarks yet</h3>
              <p className="text-sm text-zinc-500 max-w-md">
                Import your Chrome bookmarks to get started, then categorize them to see them here.
              </p>
            </div>
          ) : (
            <div
              data-testid="bookmark-grid"
              className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4"
            >
              {displayedBookmarks.map(bookmark => (
                bookmark.isTweet ? (
                  <article key={bookmark.id} className="break-inside-avoid mb-4">
                    <TweetCard url={bookmark.url} title={bookmark.title} />
                  </article>
                ) : (
                  <article
                    key={bookmark.id}
                    className="break-inside-avoid mb-4 group relative rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/30 hover:border-zinc-700/50 transition-all overflow-hidden"
                  >
                    <BrowseLinkCard
                      url={bookmark.url}
                      title={bookmark.title}
                      domain={bookmark.domain}
                      notes={bookmark.notes}
                      ogImage={bookmark.ogImage}
                    />
                  </article>
                )
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-8"
            >
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
