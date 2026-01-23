'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/bookmarks/export')
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Create temporary anchor to trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = 'bookmarks.html'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      aria-label="Export keepers"
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Export Keepers
    </button>
  )
}
