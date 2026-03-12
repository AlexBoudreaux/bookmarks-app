/**
 * Tweet Content Fetcher
 *
 * Fetches tweet text, media info, and URLs for all tweet bookmarks
 * that don't have content cached yet. Safe to interrupt and re-run
 * because it skips tweets that already have content in the database.
 *
 * Usage:
 *   npx tsx scripts/fetch-tweet-content.ts             # Fetch unfetched only
 *   npx tsx scripts/fetch-tweet-content.ts --limit 5   # Fetch first 5 only
 *   npx tsx scripts/fetch-tweet-content.ts --force      # Re-fetch ALL tweets
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from project root
config({ path: resolve(__dirname, '../.env.local') })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { getTweetId } from '../src/lib/tweet-utils'
import { fetchTweet } from 'react-tweet/api'

const sql = neon(process.env.neon_DATABASE_URL!)
const db = drizzle(sql, { schema })

const DELAY_MS = 2000
const MAX_RETRIES = 5
const INITIAL_BACKOFF_MS = 5000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface FetchResult {
  bookmarkId: string
  tweetId: string
  status: 'success' | 'not_found' | 'tombstone' | 'error'
  content?: string
  hasMedia?: boolean
  urls?: string[]
  authorName?: string
  authorHandle?: string
  error?: string
}

async function fetchWithRetry(tweetId: string, bookmarkId: string): Promise<FetchResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await fetchTweet(tweetId)

      if (result.notFound) {
        return { bookmarkId, tweetId, status: 'not_found' }
      }

      if (result.tombstone) {
        return { bookmarkId, tweetId, status: 'tombstone' }
      }

      if (!result.data) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
        console.log(`  Empty response for ${tweetId}, backing off ${backoff / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(backoff)
        continue
      }

      const tweet = result.data
      const urls = tweet.entities?.urls
        ?.map(u => u.expanded_url)
        .filter((u): u is string => !!u && !u.includes('t.co')) || []
      const hasMedia = (tweet.mediaDetails?.length ?? 0) > 0

      // Build full content with quote tweet and truncation marker
      let fullContent = tweet.text

      // Mark truncated long tweets (note_tweet means syndication API truncated it)
      if (tweet.note_tweet) {
        fullContent += '\n\n[Full tweet text truncated by Twitter API]'
      }

      // Append quote tweet content if present
      if (tweet.quoted_tweet) {
        const qt = tweet.quoted_tweet
        const qtHandle = qt.user?.screen_name ? `@${qt.user.screen_name}` : 'unknown'
        fullContent += `\n\n> Quote from ${qtHandle}:\n> ${qt.text.split('\n').join('\n> ')}`
      }

      return {
        bookmarkId,
        tweetId,
        status: 'success',
        content: fullContent,
        hasMedia,
        urls,
        authorName: tweet.user?.name,
        authorHandle: tweet.user?.screen_name,
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)

      if (errMsg.includes('429') || errMsg.includes('Too Many')) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
        console.log(`  Rate limited on ${tweetId}, backing off ${backoff / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(backoff)
        continue
      }

      return { bookmarkId, tweetId, status: 'error', error: errMsg }
    }
  }

  return { bookmarkId, tweetId, status: 'error', error: 'Max retries exceeded' }
}

async function main() {
  console.log('Connecting to database...')

  const force = process.argv.includes('--force')

  const allTweets = await db
    .select({
      id: schema.bookmarks.id,
      url: schema.bookmarks.url,
      content: schema.bookmarks.content,
    })
    .from(schema.bookmarks)
    .where(eq(schema.bookmarks.isTweet, true))

  const needsFetch = force ? allTweets : allTweets.filter(t => !t.content)

  console.log(`Total tweets: ${allTweets.length}`)
  console.log(`Already have content: ${allTweets.length - needsFetch.length}`)
  console.log(`Need to fetch: ${needsFetch.length}${force ? ' (--force re-fetch all)' : ''}`)
  console.log()

  if (needsFetch.length === 0) {
    console.log('Nothing to fetch!')
    return
  }

  const limit = process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10)
    : needsFetch.length
  const toProcess = needsFetch.slice(0, limit)

  if (limit < needsFetch.length) {
    console.log(`Processing ${toProcess.length} of ${needsFetch.length} (--limit ${limit})`)
    console.log()
  }

  const stats = { success: 0, notFound: 0, tombstone: 0, error: 0, noTweetId: 0 }
  const errors: { url: string; error: string }[] = []
  const startTime = Date.now()

  for (let i = 0; i < toProcess.length; i++) {
    const bookmark = toProcess[i]
    const tweetId = getTweetId(bookmark.url)
    const progress = `[${i + 1}/${toProcess.length}]`

    if (!tweetId) {
      console.log(`${progress} SKIP no tweet ID: ${bookmark.url}`)
      stats.noTweetId++
      continue
    }

    console.log(`${progress} Fetching ${tweetId}...`)

    const result = await fetchWithRetry(tweetId, bookmark.id)

    switch (result.status) {
      case 'success': {
        const contentPreview = result.content?.substring(0, 80) || ''
        console.log(`  ✓ ${result.authorHandle}: "${contentPreview}..."`)
        if (result.content?.includes('> Quote from')) {
          console.log(`    📎 Includes quote tweet`)
        }
        if (result.content?.includes('[Full tweet text truncated')) {
          console.log(`    ⚠️  Long tweet (truncated by API)`)
        }
        if (result.urls && result.urls.length > 0) {
          console.log(`    URLs: ${result.urls.join(', ')}`)
        }

        await db
          .update(schema.bookmarks)
          .set({
            content: result.content,
            hasMedia: result.hasMedia,
            updatedAt: new Date(),
          })
          .where(eq(schema.bookmarks.id, bookmark.id))

        stats.success++
        break
      }
      case 'not_found': {
        console.log(`  ✗ Not found (deleted)`)
        await db
          .update(schema.bookmarks)
          .set({ content: '[DELETED]', updatedAt: new Date() })
          .where(eq(schema.bookmarks.id, bookmark.id))
        stats.notFound++
        break
      }
      case 'tombstone': {
        console.log(`  ✗ Tombstone (private/suspended)`)
        await db
          .update(schema.bookmarks)
          .set({ content: '[PRIVATE]', updatedAt: new Date() })
          .where(eq(schema.bookmarks.id, bookmark.id))
        stats.tombstone++
        break
      }
      case 'error': {
        console.log(`  ✗ Error: ${result.error}`)
        errors.push({ url: bookmark.url, error: result.error || 'Unknown' })
        stats.error++
        break
      }
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log()
  console.log('=== COMPLETE ===')
  console.log(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`)
  console.log(`Success: ${stats.success}`)
  console.log(`Not found: ${stats.notFound}`)
  console.log(`Tombstone: ${stats.tombstone}`)
  console.log(`Errors: ${stats.error}`)
  console.log(`No tweet ID: ${stats.noTweetId}`)

  if (errors.length > 0) {
    console.log()
    console.log('=== ERRORS ===')
    errors.forEach(e => console.log(`  ${e.url}: ${e.error}`))
  }
}

main().catch(console.error)
