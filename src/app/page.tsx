import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Dropzone } from '@/components/import/dropzone';
import { supabase } from '@/lib/supabase';

export default async function Home() {
  const { count } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true });

  const hasBookmarks = (count ?? 0) > 0;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Bookmarks</h1>
          {hasBookmarks && (
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
        <div className="w-full max-w-3xl py-16">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
              Import Your Bookmarks
            </h2>
            <p className="text-lg text-muted-foreground">
              Drop your Chrome bookmarks file to get started
            </p>
          </div>

          <Dropzone />
        </div>
      </main>
    </div>
  );
}
