"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useStore } from "@/lib/store";
import { shelfLabel } from "@/lib/shelves";
import { parseGoodreads, SAMPLE_GOODREADS_CSV, type ImportRow } from "@/lib/books";
import { BookCover, Button, Card, Pill, TopBar } from "@/components/ui";


export default function Import() {
  const { mutate, synced } = useStore();
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState("");

  function load(text: string) {
    try {
      setRows(parseGoodreads(text));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const matched = rows?.filter((r) => r.matched) ?? [];
  const unmatched = rows?.filter((r) => !r.matched) ?? [];

  return (
    <>
      <TopBar title="Goodreads import" back="/" />
      <main className="px-4 pb-4 pt-4">
        {!rows ? (
          <>
            <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed">
              <p className="font-medium">Use the Goodreads website, not the app</p>
              <p className="mt-1 text-muted">
                The Goodreads mobile app can&apos;t export your library. Open goodreads.com in a web browser on your phone or computer instead.
              </p>
            </div>
            <ol className="space-y-3 px-1 text-[15px] leading-relaxed">
              <li>
                <span className="font-semibold">1.</span> On the Goodreads website, go to My Books, then Import and export, and tap <span className="font-medium">Export library</span>. Or go straight to{" "}
                <a href="https://www.goodreads.com/review/import" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline underline-offset-2">
                  goodreads.com/review/import
                </a>
                .
              </li>
              <li>
                <span className="font-semibold">2.</span> Download the CSV file it gives you. If you exported on a computer, open this page there too, or send the file to your phone.
              </li>
              <li>
                <span className="font-semibold">3.</span> Choose it here. We read the file on your phone and keep only your book list: titles, shelves and ratings, never your reviews or notes.
              </li>
            </ol>
            <label className="mt-6 flex h-12 cursor-pointer items-center justify-center rounded-full bg-accent text-[15px] font-medium text-white">
              Choose CSV file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) load(await file.text());
              }} />
            </label>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => load(SAMPLE_GOODREADS_CSV)}>
              No file handy? Try a sample
            </Button>
            {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
          </>
        ) : (
          <>
            <Card className="flex justify-around text-center">
              <div>
                <p className="font-serif text-2xl font-semibold">{rows.length}</p>
                <p className="text-xs text-muted">books found</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-accent">{matched.length}</p>
                <p className="text-xs text-muted">matched by ISBN</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-ai">{unmatched.length}</p>
                <p className="text-xs text-muted">need a hand</p>
              </div>
            </Card>
            <div className="mt-4 space-y-2">
              {rows.map((r) => (
                <div key={r.book.id} className="flex items-center gap-3 rounded-xl bg-card p-2">
                  <BookCover book={r.book} width={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.book.title}</p>
                    <p className="truncate text-sm text-muted">{r.book.author}</p>
                  </div>
                  {r.matched ? <Pill>{shelfLabel(r.shelf)}</Pill> : <Pill tone="ai">No ISBN</Pill>}
                </div>
              ))}
            </div>
            {unmatched.length > 0 && <p className="mt-3 px-1 text-xs text-muted">Books without an ISBN get added too. In the real app you&apos;ll be able to pick the right edition for each.</p>}
            {/* Pinned to the bottom, so a long library doesn't hide the button that saves it. */}
            <div className="sticky bottom-0 -mx-4 mt-5 border-t border-line/70 bg-paper/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
              <Button
                className="w-full"
                onClick={() => {
                  mutate((d) => actions.importShelf(d, rows));
                  router.push("/");
                }}
              >
                Add {rows.length} books to my shelves
              </Button>
              <p className="mt-1.5 text-center text-xs text-muted">{synced ? "Saved to your account, so they show on any device." : "Saved on this device. Sign in to keep them on every device."}</p>
              <Button variant="ghost" className="mt-1 w-full" onClick={() => setRows(null)}>
                Start over
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
