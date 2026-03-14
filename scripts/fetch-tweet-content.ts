/**
 * Tweet Content Fetcher (via TwitterAPI.io)
 *
 * Fetches full tweet text, quote tweets, media info, and URLs for all
 * tweet bookmarks. Uses TwitterAPI.io for complete long tweet text and
 * nested quote tweet data. Batches requests for efficiency.
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

const sql = neon(process.env.neon_DATABASE_URL!)
const db = drizzle(sql, { schema })

const API_KEY = process.env.TWITTER_API_IO_KEY
const API_BASE = 'https://api.twitterapi.io/twitter/tweets'
const BATCH_SIZE = 50
const DELAY_BETWEEN_BATCHES_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface TwitterApiTweet {
  id: string
  text: string
  author: {
    userName: string
    name: string
  }
  entities?: {
    urls?: Array<{ expanded_url?: string }>
    hashtags?: Array<{ text: string }>
  }
  extendedEntities?: {
    media?: Array<{ type: string }>
  }
  quoted_tweet?: TwitterApiTweet | null
  retweeted_tweet?: TwitterApiTweet | null
  media?: { photos?: unknown[]; videos?: unknown[] } | null
}

interface TwitterApiResponse {
  tweets: TwitterApiTweet[]
  status: string
  message?: string
}

interface BookmarkRecord {
  id: string
  url: string
  content: string | null
  tweetId: string // extracted tweet ID
}

function buildContent(tweet: TwitterApiTweet): string {
  let content = tweet.text

  // Append quote tweet content if present
  if (tweet.quoted_tweet) {
    const qt = tweet.quoted_tweet
    const qtHandle = qt.author?.userName ? `@${qt.author.userName}` : 'unknown'
    content += `\n\n> Quote from ${qtHandle}:\n> ${qt.text.split('\n').join('\n> ')}`
  }

  return content
}

function extractUrls(tweet: TwitterApiTweet): string[] {
  const urls = tweet.entities?.urls
    ?.map(u => u.expanded_url)
    .filter((u): u is string => !!u && !u.includes('t.co')) || []

  // Also grab URLs from quoted tweet
  if (tweet.quoted_tweet?.entities?.urls) {
    const qtUrls = tweet.quoted_tweet.entities.urls
      .map(u => u.expanded_url)
      .filter((u): u is string => !!u && !u.includes('t.co'))
    urls.push(...qtUrls)
  }

  return [...new Set(urls)]
}

function hasMediaContent(tweet: TwitterApiTweet): boolean {
  if (tweet.media?.photos?.length || tweet.media?.videos?.length) return true
  if (tweet.extendedEntities?.media?.length) return true
  return false
}

async function fetchBatch(tweetIds: string[]): Promise<Map<string, TwitterApiTweet>> {
  const response = await fetch(`${API_BASE}?tweet_ids=${tweetIds.join(',')}`, {
    headers: { 'X-API-Key': API_KEY! },
  })

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${await response.text()}`)
  }

  const data: TwitterApiResponse = await response.json()

  if (data.status !== 'success') {
    throw new Error(`API error: ${data.message || 'unknown'}`)
  }

  const map = new Map<string, TwitterApiTweet>()
  for (const tweet of data.tweets) {
    map.set(tweet.id, tweet)
  }
  return map
}

async function main() {
  if (!API_KEY) {
    console.error('Missing TWITTER_API_IO_KEY in .env.local')
    process.exit(1)
  }

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

  // Extract tweet IDs and filter out bookmarks without valid IDs
  const withTweetIds: BookmarkRecord[] = allTweets
    .map(t => ({ ...t, tweetId: getTweetId(t.url) || '' }))
    .filter(t => t.tweetId !== '')

  const needsFetch = force ? withTweetIds : withTweetIds.filter(t => !t.content)

  console.log(`Total tweets: ${allTweets.length}`)
  console.log(`Valid tweet IDs: ${withTweetIds.length}`)
  console.log(`Already have content: ${withTweetIds.length - needsFetch.length}`)
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

  const stats = { success: 0, notFound: 0, error: 0 }
  const errors: { url: string; error: string }[] = []
  const startTime = Date.now()

  // Process in batches
  const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE)

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE
    const batch = toProcess.slice(batchStart, batchStart + BATCH_SIZE)
    const tweetIds = batch.map(b => b.tweetId)

    console.log(`Batch ${batchIdx + 1}/${totalBatches} (${batch.length} tweets)...`)

    try {
      const tweetMap = await fetchBatch(tweetIds)

      for (const bookmark of batch) {
        const tweet = tweetMap.get(bookmark.tweetId)

        if (!tweet) {
          console.log(`  ✗ ${bookmark.tweetId} not found`)
          await db
            .update(schema.bookmarks)
            .set({ content: '[DELETED]', updatedAt: new Date() })
            .where(eq(schema.bookmarks.id, bookmark.id))
          stats.notFound++
          continue
        }

        const content = buildContent(tweet)
        const urls = extractUrls(tweet)
        const hasMedia = hasMediaContent(tweet)

        const contentPreview = content.substring(0, 80)
        console.log(`  ✓ @${tweet.author?.userName}: "${contentPreview}..."`)
        if (tweet.quoted_tweet) {
          console.log(`    📎 Includes quote tweet from @${tweet.quoted_tweet.author?.userName}`)
        }
        if (urls.length > 0) {
          console.log(`    URLs: ${urls.join(', ')}`)
        }

        await db
          .update(schema.bookmarks)
          .set({
            content,
            hasMedia,
            updatedAt: new Date(),
          })
          .where(eq(schema.bookmarks.id, bookmark.id))

        stats.success++
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ Batch failed: ${errMsg}`)

      // Mark all in batch as errors
      for (const bookmark of batch) {
        errors.push({ url: bookmark.url, error: errMsg })
        stats.error++
      }
    }

    // Delay between batches
    if (batchIdx < totalBatches - 1) {
      await sleep(DELAY_BETWEEN_BATCHES_MS)
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log()
  console.log('=== COMPLETE ===')
  console.log(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`)
  console.log(`Success: ${stats.success}`)
  console.log(`Not found: ${stats.notFound}`)
  console.log(`Errors: ${stats.error}`)

  if (errors.length > 0) {
    console.log()
    console.log('=== ERRORS ===')
    errors.forEach(e => console.log(`  ${e.url}: ${e.error}`))
  }
}

main().catch(console.error)
