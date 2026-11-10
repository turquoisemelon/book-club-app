"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { SHELVES, shelfBooks, type ShelfName } from "@/lib/shelves";
import { ShelfBook } from "@/components/shelf";
import { Card, TopBar, cx } from "@/components/ui";

export default function Books({ searchParams }: { searchParams: Promise<{ shelf?: string }> }) {
  const { shelf: asked } = use(searchParams);
  const { db } = useStore();
  const lists = Object.fromEntries(SHELVES.map((s) => [s.id, shelfBooks(db, db.meId, s.id)])) as Record<ShelfName, ReturnType<typeof shelfBooks>>;
  // Open the shelf that was tapped, else the first one with books on it.
  const initial = SHELVES.find((s) => s.id === asked)?.id ?? SHELVES.find((s) => lists[s.id].length)?.id ?? "to-read";
  const [shelf, setShelf] = useState<ShelfName>(initial);
  const books = lists[shelf];

  return (
    <>
      <TopBar
        title="Your books"
        back="/"
        right={
          <Link href="/import" className="px-2 text-sm font-medium text-accent">
            Import
          </Link>
        }
      />
      <main className="px-4 pb-10">
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {SHELVES.map((s) => (
            <button
              key={s.id}
              onClick={() => setShelf(s.id)}
              className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", shelf === s.id ? "border-accent bg-accent text-white" : "border-line bg-card")}
            >
              {s.label} · {lists[s.id].length}
            </button>
          ))}
        </div>
        {books.length ? (
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] justify-items-center gap-x-3 gap-y-5">
            {books.map(({ book, entry }) => (
              <ShelfBook key={entry.bookId} book={book!} entry={entry} width={100} />
            ))}
          </div>
        ) : (
          <Card className="mt-4 text-center text-sm text-muted">Nothing on this shelf yet.</Card>
        )}
      </main>
    </>
  );
}
