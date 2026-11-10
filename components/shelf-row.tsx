"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Book, ShelfEntry } from "@/lib/types";
import type { ShelfName } from "@/lib/shelves";
import { ShelfBook } from "./shelf";

const MAX = 12;

// One shelf on the home screen. "Reading now" is always open; the others start
// collapsed to keep home tidy, and open with a tap on their header.
export function ShelfRow({
  id,
  label,
  books,
  collapsible = false,
}: {
  id: ShelfName;
  label: string;
  books: { book?: Book; entry: ShelfEntry }[];
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const panelId = useId();
  const big = !collapsible;

  const row = (
    <div id={panelId} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {books.slice(0, MAX).map(({ book, entry }) => (
        <ShelfBook key={entry.bookId} book={book!} entry={entry} width={big ? 96 : 76} />
      ))}
      {books.length > MAX && (
        <Link
          href={`/books?shelf=${id}`}
          className="flex w-[76px] shrink-0 items-center justify-center rounded-md border border-dashed border-line text-center text-xs font-medium text-accent"
          style={{ height: 114 }}
        >
          {books.length - MAX} more
        </Link>
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <section className="mb-4">
        <Link href={`/books?shelf=${id}`} className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="font-serif text-lg font-semibold">{label}</h3>
          <span className="text-sm text-muted">{books.length}</span>
        </Link>
        {row}
      </section>
    );
  }

  return (
    <section className="mb-2 border-t border-line">
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex flex-1 items-center gap-2 py-3 text-left"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <h3 className="font-serif text-lg font-semibold">{label}</h3>
          <span className="text-sm text-muted">{books.length}</span>
        </button>
        {open && (
          <Link href={`/books?shelf=${id}`} className="text-sm font-medium text-accent">
            See all
          </Link>
        )}
      </div>
      {open && <div className="pb-3">{row}</div>}
    </section>
  );
}
