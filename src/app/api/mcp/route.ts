import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { db } from '@/db'
import { categories } from '@/db/schema'
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
  },
  {},
  {
    basePath: '/api',
    disableSse: true,
    verboseLogs: true,
  }
)

export { handler as GET, handler as POST, handler as DELETE }
