import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Dropzone } from '@/components/import/dropzone';
import { db } from '@/db';
import { bookmarks } from '@/db/schema';
import { and, eq, ne, count } from 'drizzle-orm';

// Disable Next.js caching so bookmark count is always fresh
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Check for uncategorized bookmarks (excluding keepers, skipped, and archived)
  const uncategorizedRows = await db
    .select({ value: count() })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.isCategorized, false),
        eq(bookmarks.isKeeper, false),
        eq(bookmarks.isSkipped, false),
        ne(bookmarks.chromeFolderPath, 'Archived Bookmarks')
      )
    );

  const uncategorizedCount = uncategorizedRows[0]?.value ?? 0;

  // If there are uncategorized bookmarks, go straight to categorize
  if (uncategorizedCount > 0) {
    redirect('/categorize');
  }

  // Check if user has any categorized bookmarks (to show Browse link)
  const categorizedRows = await db
    .select({ value: count() })
    .from(bookmarks)
    .where(eq(bookmarks.isCategorized, true));

  const hasCategorizedBookmarks = (categorizedRows[0]?.value ?? 0) > 0;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Bookmarks</h1>
          {hasCategorizedBookmarks && (
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex min-h-screen items-center justify-center px-6 pt-16">
        <div className="w-full max-w-2xl py-16">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {hasCategorizedBookmarks ? 'Import More Bookmarks' : 'Import Your Bookmarks'}
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              Drop your Chrome bookmarks file to add more
            </p>
          </div>

          <Dropzone />
        </div>
      </main>
    </div>
  );
}
