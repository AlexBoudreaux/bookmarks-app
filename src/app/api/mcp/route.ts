import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { db } from '@/db'
import { bookmarks, categories, bookmarkCategories } from '@/db/schema'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { buildTsQuery } from '@/lib/search-bookmarks'

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

        let bookmarkIdsInCategory: string[] | null = null
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

          bookmarkIdsInCategory = [...new Set(junctionRecords.map(r => r.bookmarkId))]

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

        // Fetch categories for these bookmarks in one query
        const resultIds = results.map(b => b.id)
        let categoryMap: Record<string, Array<{ main: string; sub: string | null; mainId: string; subId: string | null }>> = {}

        if (resultIds.length > 0) {
          const junctions = await db
            .select({
              bookmarkId: bookmarkCategories.bookmarkId,
              categoryId: bookmarkCategories.categoryId,
            })
            .from(bookmarkCategories)
            .where(inArray(bookmarkCategories.bookmarkId, resultIds))

          const allCatIds = [...new Set(junctions.map(j => j.categoryId))]

          if (allCatIds.length > 0) {
            const cats = await db
              .select()
              .from(categories)
              .where(inArray(categories.id, allCatIds))

            const catById = Object.fromEntries(cats.map(c => [c.id, c]))

            for (const j of junctions) {
              const cat = catById[j.categoryId]
              if (!cat) continue

              if (!categoryMap[j.bookmarkId]) categoryMap[j.bookmarkId] = []

              if (cat.parentId) {
                const parent = catById[cat.parentId]
                categoryMap[j.bookmarkId].push({
                  main: parent?.name || 'Unknown',
                  mainId: cat.parentId,
                  sub: cat.name,
                  subId: cat.id,
                })
              } else {
                const alreadyHasSub = categoryMap[j.bookmarkId].some(
                  c => c.mainId === cat.id
                )
                if (!alreadyHasSub) {
                  categoryMap[j.bookmarkId].push({
                    main: cat.name,
                    mainId: cat.id,
                    sub: null,
                    subId: null,
                  })
                }
              }
            }
          }
        }

        const urlRegex = /https?:\/\/[^\s)>\]]+/g

        const enrichedBookmarks = results.map(b => {
          const contentUrls = b.content?.match(urlRegex) || []
          const meaningfulUrls = contentUrls.filter(u => !u.includes('t.co/'))

          return {
            id: b.id,
            url: b.url,
            title: b.title,
            content: b.content,
            isTweet: b.isTweet,
            hasMedia: b.hasMedia,
            domain: b.domain,
            notes: b.notes,
            addDate: b.addDate,
            categories: categoryMap[b.id] || [],
            urlsInContent: meaningfulUrls,
          }
        })

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              bookmarks: enrichedBookmarks,
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
