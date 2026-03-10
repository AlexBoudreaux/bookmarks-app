import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { db } from '@/db'
import { bookmarks, categories, bookmarkCategories } from '@/db/schema'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { buildTsQuery } from '@/lib/search-bookmarks'
import { attachCategories, enrichBookmarks, extractUrls } from '@/lib/mcp-queries'

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      'list_categories',
      'List all bookmark categories as a tree (main categories with their subcategories). Returns category names, IDs, and usage counts. Use this first to understand what categories exist before searching.',
      {},
      async () => {
        const allCategories = await db
          .select()
          .from(categories)
          .orderBy(desc(categories.usageCount))

        const mainCategories = allCategories.filter(c => !c.parentId)
        const tree = mainCategories.map(main => ({
          id: main.id,
          name: main.name,
          usageCount: main.usageCount,
          subcategories: allCategories
            .filter(sub => sub.parentId === main.id)
            .map(sub => ({
              id: sub.id,
              name: sub.name,
              usageCount: sub.usageCount,
            })),
        }))

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(tree, null, 2) }],
        }
      }
    )

    server.tool(
      'get_stats',
      'Get overview statistics about the bookmarks collection. Returns total counts, breakdown by type (tweet vs non-tweet), categorized vs uncategorized, media counts, and top domains.',
      {},
      async () => {
        const allBookmarks = await db
          .select({
            isTweet: bookmarks.isTweet,
            isCategorized: bookmarks.isCategorized,
            isSkipped: bookmarks.isSkipped,
            isKeeper: bookmarks.isKeeper,
            hasMedia: bookmarks.hasMedia,
            domain: bookmarks.domain,
          })
          .from(bookmarks)

        const active = allBookmarks.filter(b => !b.isKeeper && !b.isSkipped)
        const tweets = active.filter(b => b.isTweet)
        const categorized = active.filter(b => b.isCategorized)
        const withMedia = active.filter(b => b.hasMedia)

        const domainCounts: Record<string, number> = {}
        active.forEach(b => {
          if (b.domain) domainCounts[b.domain] = (domainCounts[b.domain] || 0) + 1
        })
        const topDomains = Object.entries(domainCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([domain, count]) => ({ domain, count }))

        const stats = {
          total: active.length,
          tweets: tweets.length,
          nonTweets: active.length - tweets.length,
          categorized: categorized.length,
          uncategorized: active.length - categorized.length,
          withMedia: withMedia.length,
          skipped: allBookmarks.filter(b => b.isSkipped).length,
          keepers: allBookmarks.filter(b => b.isKeeper).length,
          topDomains,
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
        }
      }
    )

    server.tool(
      'search_bookmarks',
      'Search bookmarks using full-text search with optional filters. Returns rich data including tweet content, categories, media info, and URLs found in tweets. Use list_categories first to get valid category IDs for filtering.',
      {
        query: z.string().optional().describe('Full-text search query (searches title, content, notes)'),
        categoryId: z.string().uuid().optional().describe('Filter by category ID (main or subcategory)'),
        isTweet: z.boolean().optional().describe('Filter to tweets only (true) or non-tweets only (false)'),
        hasMedia: z.boolean().optional().describe('Filter to bookmarks with media (images/video)'),
        domain: z.string().optional().describe('Filter by domain (e.g., "github.com")'),
        limit: z.number().int().min(1).max(100).default(50).describe('Max results to return (default 50, max 100)'),
        offset: z.number().int().min(0).default(0).describe('Offset for pagination'),
      },
      async ({ query, categoryId, isTweet, hasMedia, domain, limit, offset }) => {
        const conditions: ReturnType<typeof eq>[] = [
          eq(bookmarks.isKeeper, false),
          eq(bookmarks.isSkipped, false),
          eq(bookmarks.isCategorized, true),
        ]

        if (query) {
          const tsQuery = buildTsQuery(query)
          if (tsQuery) {
            conditions.push(sql`fts @@ to_tsquery('english', ${tsQuery})`)
          }
        }

        if (isTweet !== undefined) {
          conditions.push(eq(bookmarks.isTweet, isTweet))
        }

        if (hasMedia !== undefined) {
          conditions.push(eq(bookmarks.hasMedia, hasMedia))
        }

        if (domain) {
          conditions.push(eq(bookmarks.domain, domain))
        }

        if (categoryId) {
          const categoryAndChildren = await db
            .select({ id: categories.id })
            .from(categories)
            .where(sql`${categories.id} = ${categoryId} OR ${categories.parentId} = ${categoryId}`)

          const catIds = categoryAndChildren.map(c => c.id)

          const junctionRecords = await db
            .select({ bookmarkId: bookmarkCategories.bookmarkId })
            .from(bookmarkCategories)
            .where(inArray(bookmarkCategories.categoryId, catIds))

          const bookmarkIdsInCategory = [...new Set(junctionRecords.map(r => r.bookmarkId))]

          if (bookmarkIdsInCategory.length === 0) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ bookmarks: [], total: 0, limit, offset }, null, 2) }],
            }
          }

          conditions.push(inArray(bookmarks.id, bookmarkIdsInCategory))
        }

        const [{ count: totalCount }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(bookmarks)
          .where(and(...conditions))

        const results = await db
          .select()
          .from(bookmarks)
          .where(and(...conditions))
          .orderBy(desc(bookmarks.addDate))
          .limit(limit)
          .offset(offset)

        const categoryMap = await attachCategories(results.map(b => b.id))
        const enriched = enrichBookmarks(results, categoryMap)

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              bookmarks: enriched,
              total: Number(totalCount),
              limit,
              offset,
            }, null, 2),
          }],
        }
      }
    )

    server.tool(
      'get_bookmark',
      'Get full details for a single bookmark by ID. Returns all fields including tweet content, categories, and media info.',
      {
        id: z.string().uuid().describe('The bookmark UUID'),
      },
      async ({ id }) => {
        const [bookmark] = await db
          .select()
          .from(bookmarks)
          .where(eq(bookmarks.id, id))
          .limit(1)

        if (!bookmark) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Bookmark not found' }) }],
          }
        }

        const categoryMap = await attachCategories([id])

        const result = {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          content: bookmark.content,
          isTweet: bookmark.isTweet,
          hasMedia: bookmark.hasMedia,
          domain: bookmark.domain,
          notes: bookmark.notes,
          ogImage: bookmark.ogImage,
          addDate: bookmark.addDate,
          categories: categoryMap[id] || [],
          urlsInContent: extractUrls(bookmark.content),
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        }
      }
    )

    server.tool(
      'get_bookmarks_by_category',
      'Get all bookmarks in a specific category or subcategory. If you pass a main category ID, it includes all bookmarks in any of its subcategories too. Returns rich data with content, media info, and all category assignments. Use list_categories first to get valid category IDs.',
      {
        categoryId: z.string().uuid().describe('Category ID (main or subcategory)'),
        isTweet: z.boolean().optional().describe('Filter to tweets only (true) or non-tweets only (false)'),
        limit: z.number().int().min(1).max(100).default(50).describe('Max results (default 50, max 100)'),
        offset: z.number().int().min(0).default(0).describe('Offset for pagination'),
      },
      async ({ categoryId, isTweet, limit, offset }) => {
        const categoryAndChildren = await db
          .select({ id: categories.id })
          .from(categories)
          .where(sql`${categories.id} = ${categoryId} OR ${categories.parentId} = ${categoryId}`)

        const catIds = categoryAndChildren.map(c => c.id)

        if (catIds.length === 0) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Category not found' }) }],
          }
        }

        const junctionRecords = await db
          .select({ bookmarkId: bookmarkCategories.bookmarkId })
          .from(bookmarkCategories)
          .where(inArray(bookmarkCategories.categoryId, catIds))

        const bookmarkIdsInCat = [...new Set(junctionRecords.map(r => r.bookmarkId))]

        if (bookmarkIdsInCat.length === 0) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ bookmarks: [], total: 0, limit, offset }, null, 2) }],
          }
        }

        const conditions = [
          inArray(bookmarks.id, bookmarkIdsInCat),
          eq(bookmarks.isKeeper, false),
          eq(bookmarks.isSkipped, false),
        ]

        if (isTweet !== undefined) {
          conditions.push(eq(bookmarks.isTweet, isTweet))
        }

        const [{ count: totalCount }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(bookmarks)
          .where(and(...conditions))

        const results = await db
          .select()
          .from(bookmarks)
          .where(and(...conditions))
          .orderBy(desc(bookmarks.addDate))
          .limit(limit)
          .offset(offset)

        const categoryMap = await attachCategories(results.map(b => b.id))
        const enriched = enrichBookmarks(results, categoryMap)

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              bookmarks: enriched,
              total: Number(totalCount),
              limit,
              offset,
            }, null, 2),
          }],
        }
      }
    )
  },
  {},
  {
    basePath: '/api',
    disableSse: true,
    verboseLogs: true,
  }
)

export { handler as GET, handler as POST, handler as DELETE }
