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
    <div className="flex flex-col items-center justify-center min-h-[500px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
      <div className="max-w-2xl w-full text-center">
        {/* OG Image or Link Icon */}
        {ogImage ? (
          <div className="relative mb-6 rounded-lg overflow-hidden mx-auto max-w-lg">
            <img
              src={ogImage}
              alt=""
              loading="lazy"
              className="w-full h-auto max-h-64 object-cover rounded-lg"
            />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-6">
            <ExternalLink className="w-8 h-8 text-zinc-600" />
          </div>
        )}

        {/* Title */}
        {title && (
          <h2 className="text-2xl font-semibold text-zinc-100 mb-4 break-words">
            {title}
          </h2>
        )}

        {/* Domain */}
        <p className="text-sm text-zinc-500 mb-3 font-mono">{domain}</p>

        {/* URL Link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors break-all"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-xl">{url}</span>
        </a>
      </div>
    </div>
  )
}
