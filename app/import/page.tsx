"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useStore } from "@/lib/store";
import { parseGoodreads, SAMPLE_GOODREADS_CSV, type ImportRow } from "@/lib/books";
import { BookCover, Button, Card, Pill, TopBar } from "@/components/ui";

const shelfLabel = { read: "Read", "to-read": "Want to read", "currently-reading": "Reading" };

export default function Import() {
  const { mutate } = useStore();
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
      <main className="px-4 pb-10 pt-4">
        {!rows ? (
          <>
            <ol className="space-y-3 px-1 text-[15px] leading-relaxed">
              <li>
                <span className="font-semibold">1.</span> On Goodreads, go to My Books, then Import and export, and tap <span className="font-medium">Export library</span>.
              </li>
              <li>
                <span className="font-semibold">2.</span> Download the CSV file it gives you.
              </li>
              <li>
                <span className="font-semibold">3.</span> Upload it here. It&apos;s read on your phone and never stored on our servers.
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
                  {r.matched ? <Pill>{shelfLabel[r.shelf]}</Pill> : <Pill tone="ai">No ISBN</Pill>}
                </div>
              ))}
            </div>
            {unmatched.length > 0 && <p className="mt-3 px-1 text-xs text-muted">Books without an ISBN get added too. In the real app you&apos;ll be able to pick the right edition for each.</p>}
            <Button
              className="mt-5 w-full"
              onClick={() => {
                mutate((d) => actions.importShelf(d, rows));
                router.push("/");
              }}
            >
              Add {rows.length} books to my shelves
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setRows(null)}>
              Start over
            </Button>
          </>
        )}
      </main>
    </>
  );
}
