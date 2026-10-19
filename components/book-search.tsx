"use client";

import { useEffect, useState } from "react";
import { searchOpenLibrary } from "@/lib/books";
import type { Book } from "@/lib/types";
import { BookCover, Button, inputClass } from "./ui";

export function BookSearch({ onPick, onClose }: { onPick: (book: Book) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        setResults(await searchOpenLibrary(query, controller.signal));
        setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-3 font-serif text-xl font-semibold">Add a book</h2>
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, author or ISBN" className={inputClass} />
        <p className="mt-2 text-xs text-muted">Searching Open Library, live.</p>
        <div className="mt-3 space-y-2">
          {state === "loading" && <p className="py-4 text-center text-sm text-muted">Searching…</p>}
          {state === "error" && <p className="py-4 text-center text-sm text-danger">Couldn&apos;t reach Open Library. Check your connection and try again.</p>}
          {query.trim().length >= 3 &&
            results.map((b) => (
              <button key={b.id} onClick={() => onPick(b)} className="flex w-full items-center gap-3 rounded-xl bg-card p-2 text-left active:bg-accent-soft">
                <BookCover book={b} width={40} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.title}</p>
                  <p className="truncate text-sm text-muted">
                    {b.author}
                    {b.pages ? ` · ${b.pages} pages` : ""}
                  </p>
                </div>
              </button>
            ))}
        </div>
        <Button variant="ghost" className="mt-3 w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
