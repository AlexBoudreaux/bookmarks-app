'use client'

import { Tweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { getTweetId } from '@/lib/tweet-utils'
import { ExternalLink, Twitter } from 'lucide-react'
import { Suspense } from 'react'

interface TweetCardProps {
  url: string
  title: string | null
}

function TweetEmbed({ tweetId, url }: { tweetId: string; url: string }) {
  return (
    <div className="tweet-card-embed">
      <Suspense fallback={<TweetSkeleton />}>
        <Tweet id={tweetId} />
      </Suspense>
    </div>
  )
}

function TweetFallback({ url, title }: { url: string; title: string | null }) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
          <Twitter className="w-4 h-4 text-sky-400" />
        </div>
        <span className="text-xs font-medium text-sky-400">Tweet</span>
      </div>
      <p className="text-sm text-zinc-300 line-clamp-4 flex-1">
        {title || 'Tweet unavailable'}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Open on X
      </a>
    </div>
  )
}

export function TweetCard({ url, title }: TweetCardProps) {
  const tweetId = getTweetId(url)

  if (!tweetId) {
    return <TweetFallback url={url} title={title} />
  }

  return (
    <div className="tweet-card overflow-hidden">
      <TweetEmbed tweetId={tweetId} url={url} />
    </div>
  )
}
