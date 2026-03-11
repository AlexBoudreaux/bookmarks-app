'use client'

import { Copy, X, CheckSquare, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectionBarProps {
  count: number
  copied: boolean
  onCopy: () => void
  onSelectAll: () => void
  onClear: () => void
}

export function SelectionBar({ count, copied, onCopy, onSelectAll, onClear }: SelectionBarProps) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/50 shadow-2xl shadow-black/50">
        <span className="text-sm text-zinc-300 font-medium tabular-nums min-w-[80px]">
          {count} selected
        </span>

        <div className="w-px h-5 bg-zinc-700/50" />

        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Select all
        </button>

        <button
          onClick={onCopy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            copied
              ? 'text-emerald-300 bg-emerald-500/20'
              : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>

        <button
          onClick={onClear}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
