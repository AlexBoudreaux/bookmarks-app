import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { db } from '@/db'
import { bookmarks, categories } from '@/db/schema'
import { desc } from 'drizzle-orm'

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
  },
  {},
  {
    basePath: '/api',
    disableSse: true,
    verboseLogs: true,
  }
)

export { handler as GET, handler as POST, handler as DELETE }
