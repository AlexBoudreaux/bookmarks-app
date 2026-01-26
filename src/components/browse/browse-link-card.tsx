'use client'

import { ExternalLink, Globe, StickyNote } from 'lucide-react'
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
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Globe className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-zinc-400">Bookmark</span>
          <p className="text-xs font-mono text-zinc-500 truncate">{displayDomain}</p>
        </div>
      </div>

      {/* OG Image (only shown if available) */}
      {ogImage && (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-800/50">
          <img
            src={ogImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col">
        {/* Title */}
        <h4 className="text-sm font-medium text-zinc-200 mb-2">
          {title || 'Untitled'}
        </h4>

        {/* Notes preview if present */}
        {notes && (
          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-zinc-800/50">
            <StickyNote className="w-3 h-3 text-amber-500/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 italic">
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
