'use client'

import { useState, useEffect } from 'react'
import { Tweet, TweetNotFound } from 'react-tweet'
import { getTweetId } from '@/lib/tweet-utils'
import { ExternalLink } from 'lucide-react'

interface TweetPreviewProps {
  url: string
}

export function TweetPreview({ url }: TweetPreviewProps) {
  const tweetId = getTweetId(url)
  // Defer tweet rendering to client to avoid hydration mismatch
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!tweetId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
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

  // Show loading placeholder on server/initial render
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <div className="animate-pulse w-full max-w-md">
          <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-zinc-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <Tweet id={tweetId} />
    </div>
  )
}
