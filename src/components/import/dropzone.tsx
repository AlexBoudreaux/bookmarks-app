'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseBookmarksHtml, type ParsedBookmark } from '@/lib/parse-bookmarks';
import { detectBoundary } from '@/lib/detect-boundary';
import { ImportSummary } from './import-summary';

export function Dropzone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({
    keeperCount: 0,
    toCategorizeCount: 0,
    tweetCount: 0,
    boundaryFound: false,
  });
  // Store parsed bookmarks for import
  const parsedBookmarksRef = useRef<ParsedBookmark[]>([]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);

    try {
      const html = await file.text();
      const bookmarks = parseBookmarksHtml(html);
      const boundary = detectBoundary(bookmarks);

      // Count tweets
      const tweetCount = bookmarks.filter((b) => b.isTweet).length;

      // Store bookmarks with keeper flag applied
      parsedBookmarksRef.current = boundary.bookmarks;

      setSummaryData({
        keeperCount: boundary.keeperCount,
        toCategorizeCount: boundary.toCategorizeCount,
        tweetCount,
        boundaryFound: boundary.boundaryFound,
      });

      setShowSummary(true);
    } catch (error) {
      console.error('Failed to parse bookmarks file:', error);
      // TODO: Show error toast in next iteration
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const htmlFile = files.find((file) => file.name.endsWith('.html'));

      if (htmlFile) {
        handleFile(htmlFile);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleStartCategorizing = useCallback(async () => {
    if (parsedBookmarksRef.current.length === 0) {
      console.error('No bookmarks to import');
      return;
    }

    setIsImporting(true);

    try {
      // Import bookmarks to database
      const response = await fetch('/api/bookmarks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks: parsedBookmarksRef.current }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import bookmarks');
      }

      // Navigate to categorize page
      router.push('/categorize');
    } catch (error) {
      console.error('Import failed:', error);
      // TODO: Show error toast
    } finally {
      setIsImporting(false);
    }
  }, [router]);

  return (
    <>
      <div className="w-full max-w-2xl">
        <label
          htmlFor="file-upload"
          className={`group relative block ${isLoading ? 'pointer-events-none' : 'cursor-pointer'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            className={`
              relative overflow-hidden rounded-2xl border-2 border-dashed
              bg-card p-16 transition-all duration-300
              ${
                isLoading
                  ? 'border-primary/50 bg-primary/5'
                  : isDragging
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:bg-card/80'
              }
            `}
          >
            {/* Glow effect on hover */}
            <div
              className={`
                pointer-events-none absolute inset-0 rounded-2xl opacity-0
                transition-opacity duration-500 group-hover:opacity-100
                ${isDragging || isLoading ? 'opacity-100' : ''}
              `}
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
              }}
            />

            <div className="relative flex flex-col items-center gap-4 text-center">
              <div
                className={`
                  rounded-full bg-primary/10 p-6 transition-all duration-300
                  ${
                    isLoading
                      ? 'animate-pulse bg-primary/20'
                      : isDragging
                        ? 'scale-110 bg-primary/20'
                        : 'group-hover:scale-105'
                  }
                `}
              >
                <Upload
                  className={`
                    h-10 w-10 transition-colors duration-300
                    ${
                      isLoading || isDragging
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-primary'
                    }
                  `}
                />
              </div>

              <div className="space-y-2">
                <p
                  className={`
                    text-xl font-medium transition-colors duration-300
                    ${isLoading || isDragging ? 'text-primary' : 'text-foreground'}
                  `}
                >
                  {isLoading
                    ? 'Parsing bookmarks...'
                    : isDragging
                      ? 'Drop your Chrome bookmarks file'
                      : 'Drop your Chrome bookmarks.html here'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'This may take a moment' : 'or click to browse'}
                </p>
              </div>
            </div>
          </div>

          <input
            id="file-upload"
            type="file"
            accept=".html"
            className="sr-only"
            onChange={handleFileInput}
            disabled={isLoading}
            aria-label="Drop your Chrome bookmarks file here or click to browse"
          />
        </label>

      {/* Instructions */}
      <div className="mt-8 space-y-3 rounded-xl border border-border/50 bg-muted/30 p-6">
        <h3 className="text-sm font-semibold text-foreground">How to export from Chrome:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              1
            </span>
            <span>Open Chrome → Bookmarks → Bookmark Manager</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              2
            </span>
            <span>Click ⋮ → Export bookmarks</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              3
            </span>
            <span>Drop the file here</span>
          </li>
        </ol>
      </div>
      </div>

      <ImportSummary
        open={showSummary}
        onOpenChange={setShowSummary}
        keeperCount={summaryData.keeperCount}
        toCategorizeCount={summaryData.toCategorizeCount}
        tweetCount={summaryData.tweetCount}
        boundaryFound={summaryData.boundaryFound}
        onStartCategorizing={handleStartCategorizing}
        isImporting={isImporting}
      />
    </>
  );
}
