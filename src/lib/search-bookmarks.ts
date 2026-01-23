/**
 * Search bookmarks using Postgres full-text search (fts column)
 */

import { supabase } from './supabase'

export interface SearchBookmarkResult {
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
): Promise<{ data: SearchBookmarkResult[] | null; error: Error | null }> {
  const tsQuery = buildTsQuery(query)

  if (!tsQuery) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, url, title, is_tweet, is_categorized, domain, notes, og_image, add_date')
    .eq('is_categorized', true)
    .eq('is_keeper', false)
    .eq('is_skipped', false)
    .textSearch('fts', tsQuery)
    .order('add_date', { ascending: false })

  return { data, error: error as Error | null }
}
