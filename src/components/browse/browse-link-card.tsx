'use client'

import { ExternalLink, FileText, StickyNote } from 'lucide-react'
import { extractDomain } from '@/lib/extract-domain'

interface BrowseLinkCardProps {
  url: string
  title: string | null
  domain: string | null
  notes: string | null
  ogImage: string | null
}

export function BrowseLinkCard({ url, title, domain, notes, ogImage }: BrowseLinkCardProps) {
  const displayDomain = domain || extractDomain(url)

  return (
    <div className="flex flex-col h-full">
      {/* OG Image or placeholder */}
      {ogImage ? (
        <div className="relative h-32 w-full overflow-hidden rounded-t-lg bg-zinc-800/50">
          <img
            src={ogImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="h-24 w-full rounded-t-lg bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-zinc-600" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Domain badge */}
        <span className="text-xs font-mono text-zinc-500 mb-2 truncate">
          {displayDomain}
        </span>

        {/* Title */}
        <h4 className="text-sm font-medium text-zinc-200 line-clamp-2 mb-2 flex-1">
          {title || 'Untitled'}
        </h4>

        {/* Notes preview if present */}
        {notes && (
          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-zinc-800/50">
            <StickyNote className="w-3 h-3 text-amber-500/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 line-clamp-2 italic">
              {notes}
            </p>
          </div>
        )}

        {/* Link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open link
        </a>
      </div>
    </div>
  )
}
