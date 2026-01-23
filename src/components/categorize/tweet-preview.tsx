'use client'

import { Tweet, TweetNotFound } from 'react-tweet'
import { getTweetId } from '@/lib/tweet-utils'

interface TweetPreviewProps {
  url: string
}

export function TweetPreview({ url }: TweetPreviewProps) {
  const tweetId = getTweetId(url)

  if (!tweetId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
        <TweetNotFound />
        <p className="mt-4 text-sm text-zinc-400">Not a valid tweet URL</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          Open in browser
        </a>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <Tweet id={tweetId} />
    </div>
  )
}
