import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { count, error } = await supabase
    .from("bookmarks")
    .select("*", { count: "exact", head: true });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-8">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          Bookmarks App
        </h1>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Supabase Connection
          </h2>
          {error ? (
            <p className="mt-2 text-red-500">Error: {error.message}</p>
          ) : (
            <p className="mt-2 text-green-600 dark:text-green-400">
              Connected! Bookmarks count: {count ?? 0}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
