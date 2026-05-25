import { NextResponse } from 'next/server'
import { getTweet } from 'react-tweet/api'
import type { Tweet, TweetBase } from 'react-tweet/api'

export const runtime = 'edge'

// react-tweet's enrichTweet crashes with "r is not iterable" when the
// syndication response omits any of these entity sub-arrays. The shape
// is documented as required, but the API returns them inconsistently.
function normalizeEntities<T extends TweetBase>(tweet: T): T {
  const e = tweet.entities ?? ({} as TweetBase['entities'])
  tweet.entities = {
    hashtags: e.hashtags ?? [],
    urls: e.urls ?? [],
    user_mentions: e.user_mentions ?? [],
    symbols: e.symbols ?? [],
    media: e.media,
  }
  return tweet
}

function normalize(tweet: Tweet): Tweet {
  normalizeEntities(tweet)
  if (tweet.quoted_tweet) normalizeEntities(tweet.quoted_tweet)
  if (tweet.parent) normalizeEntities(tweet.parent)
  return tweet
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ data: null, error: 'invalid id' }, { status: 400 })
  }

  try {
    const tweet = await getTweet(id)
    if (!tweet) {
      return NextResponse.json({ data: null }, { status: 404 })
    }
    return NextResponse.json(
      { data: normalize(tweet) },
      {
        headers: {
          'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'failed' },
      { status: 500 }
    )
  }
}
