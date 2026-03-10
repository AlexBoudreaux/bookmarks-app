/**
 * Recalculate usage_count for all categories based on actual
 * non-skipped, non-keeper bookmarks in the junction table.
 *
 * Run: npx tsx scripts/recalculate-usage-counts.ts
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sqlClient = neon(process.env.neon_DATABASE_URL!)
const db = drizzle(sqlClient, { schema })

async function main() {
  console.log('Recalculating usage counts...\n')

  // Get actual counts per category (non-skipped, non-keeper bookmarks only)
  const counts = await db
    .select({
      categoryId: schema.bookmarkCategories.categoryId,
      count: sql<number>`count(*)`,
    })
    .from(schema.bookmarkCategories)
    .innerJoin(
      schema.bookmarks,
      eq(schema.bookmarkCategories.bookmarkId, schema.bookmarks.id)
    )
    .where(
      sql`${schema.bookmarks.isSkipped} = false AND ${schema.bookmarks.isKeeper} = false`
    )
    .groupBy(schema.bookmarkCategories.categoryId)

  const countMap = new Map(counts.map(c => [c.categoryId, Number(c.count)]))

  // Get all categories
  const allCategories = await db.select().from(schema.categories)

  let updated = 0
  let unchanged = 0

  for (const cat of allCategories) {
    const actualCount = countMap.get(cat.id) || 0
    const currentCount = cat.usageCount || 0

    if (actualCount !== currentCount) {
      await db
        .update(schema.categories)
        .set({ usageCount: actualCount })
        .where(eq(schema.categories.id, cat.id))

      console.log(`  ${cat.name}: ${currentCount} → ${actualCount}`)
      updated++
    } else {
      unchanged++
    }
  }

  console.log(`\nDone. Updated ${updated} categories, ${unchanged} unchanged.`)
}

main().catch(console.error)
