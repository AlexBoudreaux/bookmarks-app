'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, ArrowRight, BookmarkIcon } from 'lucide-react';

interface ImportSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keeperCount: number;
  toCategorizeCount: number;
  tweetCount: number;
  boundaryFound: boolean;
  onStartCategorizing: () => void;
  isImporting?: boolean;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function ImportSummary({
  open,
  onOpenChange,
  keeperCount,
  toCategorizeCount,
  tweetCount,
  boundaryFound,
  onStartCategorizing,
  isImporting = false,
}: ImportSummaryProps) {
  const nonTweetCount = toCategorizeCount - tweetCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Import Summary</DialogTitle>
          <DialogDescription>
            {boundaryFound
              ? 'Your bookmarks have been analyzed'
              : 'Review your import details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Boundary Status */}
          {boundaryFound ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              <p className="text-sm text-foreground">
                Found boundary: <span className="font-medium">Tools / byebyepaywall.com</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500" />
                <p className="text-sm font-medium text-foreground">Boundary not found</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Could not find the Tools folder or byebyepaywall.com URL. You'll need to set a new end of bookmarks marker.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="space-y-3">
            {/* Keepers */}
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <BookmarkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(keeperCount)}
                    </p>
                    <p className="text-sm text-muted-foreground">bookmarks to keep</p>
                  </div>
                </div>
              </div>
            </div>

            {/* To Categorize */}
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNumber(toCategorizeCount)}
                      </p>
                      <p className="text-sm text-muted-foreground">bookmarks to categorize</p>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="ml-14 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-primary/50" />
                    <span>{formatNumber(tweetCount)} tweets</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-primary/50" />
                    <span>{formatNumber(nonTweetCount)} other links</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={onStartCategorizing}
            disabled={isImporting}
            className="group w-full gap-2 py-6 text-base font-semibold"
            size="lg"
          >
            {isImporting ? (
              <>
                Importing...
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </>
            ) : (
              <>
                Start Categorizing
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
