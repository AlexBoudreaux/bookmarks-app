/**
 * Search bookmarks using Postgres full-text search (fts column)
 */

import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'

export interface SearchBookmarkResult {
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

/**
 * Convert a search query into Postgres tsquery format
 * Handles multiple words by joining with & (AND)
 * Adds :* suffix for prefix matching
 */
export function buildTsQuery(query: string): string {
  const sanitized = query
    .trim()
    .toLowerCase()
    // Remove special characters that could break tsquery
    .replace(/[^\w\s]/g, '')
    // Split into words and filter empty
    .split(/\s+/)
    .filter(word => word.length > 0)

  if (sanitized.length === 0) {
    return ''
  }

  // Join with & for AND matching, add :* for prefix matching
  return sanitized.map(word => `${word}:*`).join(' & ')
}

/**
 * Search bookmarks using full-text search
 */
export async function searchBookmarks(
  query: string
): Promise<SearchBookmarkResult[]> {
  const tsQuery = buildTsQuery(query)

  if (!tsQuery) {
    return []
  }

  const results = await db
    .select({
      id: bookmarks.id,
      url: bookmarks.url,
      title: bookmarks.title,
      isTweet: bookmarks.isTweet,
      isCategorized: bookmarks.isCategorized,
      domain: bookmarks.domain,
      notes: bookmarks.notes,
      ogImage: bookmarks.ogImage,
      addDate: bookmarks.addDate,
    })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.isCategorized, true),
        eq(bookmarks.isKeeper, false),
        eq(bookmarks.isSkipped, false),
        sql`fts @@ to_tsquery('english', ${tsQuery})`
      )
    )
    .orderBy(sql`${bookmarks.addDate} DESC`)

  return results
}
