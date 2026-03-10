import { db } from '@/db'
import { bookmarks, categories, bookmarkCategories } from '@/db/schema'
import { inArray } from 'drizzle-orm'

export interface EnrichedBookmark {
  id: string
  url: string
  title: string | null
  content: string | null
  isTweet: boolean | null
  hasMedia: boolean | null
  domain: string | null
  notes: string | null
  addDate: Date | null
  categories: Array<{ main: string; sub: string | null }>
  urlsInContent: string[]
}

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g

export function extractUrls(content: string | null): string[] {
  if (!content) return []
  return (content.match(URL_REGEX) || []).filter(u => !u.includes('t.co/'))
}

export async function attachCategories(
  bookmarkIds: string[]
): Promise<Record<string, Array<{ main: string; sub: string | null }>>> {
  if (bookmarkIds.length === 0) return {}

  const junctions = await db
    .select({
      bookmarkId: bookmarkCategories.bookmarkId,
      categoryId: bookmarkCategories.categoryId,
    })
    .from(bookmarkCategories)
    .where(inArray(bookmarkCategories.bookmarkId, bookmarkIds))

  const catIds = [...new Set(junctions.map(j => j.categoryId))]
  if (catIds.length === 0) return {}

  const cats = await db
    .select()
    .from(categories)
    .where(inArray(categories.id, catIds))

  const catById = Object.fromEntries(cats.map(c => [c.id, c]))
  const result: Record<string, Array<{ main: string; sub: string | null }>> = {}

  for (const j of junctions) {
    const cat = catById[j.categoryId]
    if (!cat) continue
    if (!result[j.bookmarkId]) result[j.bookmarkId] = []

    if (cat.parentId) {
      const parent = catById[cat.parentId]
      result[j.bookmarkId].push({ main: parent?.name || 'Unknown', sub: cat.name })
    } else {
      const hasSub = result[j.bookmarkId].some(c => c.main === cat.name)
      if (!hasSub) {
        result[j.bookmarkId].push({ main: cat.name, sub: null })
      }
    }
  }

  return result
}

export function enrichBookmarks(
  rawBookmarks: typeof bookmarks.$inferSelect[],
  categoryMap: Record<string, Array<{ main: string; sub: string | null }>>
): EnrichedBookmark[] {
  return rawBookmarks.map(b => ({
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
    urlsInContent: extractUrls(b.content),
  }))
}
