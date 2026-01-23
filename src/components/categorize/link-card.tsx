'use client'

import { extractDomain } from '@/lib/extract-domain'
import { ExternalLink } from 'lucide-react'

interface LinkCardProps {
  title: string
  url: string
  ogImage?: string | null
}

export function LinkCard({ title, url, ogImage }: LinkCardProps) {
  const domain = extractDomain(url)

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full text-center">
        {/* OG Image or Link Icon */}
        {ogImage ? (
          <div className="relative mb-4 rounded-lg overflow-hidden mx-auto">
            <img
              src={ogImage}
              alt=""
              loading="lazy"
              className="w-full h-auto max-h-48 object-cover rounded-lg"
            />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/50 mb-4">
            <ExternalLink className="w-6 h-6 text-zinc-600" />
          </div>
        )}

        {/* Title */}
        {title && (
          <h2 className="text-lg font-semibold text-zinc-100 mb-2 break-words line-clamp-2">
            {title}
          </h2>
        )}

        {/* Domain */}
        <p className="text-xs text-zinc-500 mb-2 font-mono">{domain}</p>

        {/* URL Link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate max-w-xs">{url}</span>
        </a>
      </div>
    </div>
  )
}
