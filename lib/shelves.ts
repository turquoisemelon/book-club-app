import type { DB, ShelfEntry } from "./types";

export type ShelfName = ShelfEntry["shelf"];

export const SHELVES: { id: ShelfName; label: string; short: string }[] = [
  { id: "currently-reading", label: "Reading now", short: "Reading" },
  { id: "to-read", label: "Want to read", short: "Want to read" },
  { id: "read", label: "Read", short: "Read" },
];

export const shelfLabel = (id: ShelfName) => SHELVES.find((s) => s.id === id)!.short;

// One shelf, newest first: finished most recently for "Read", added most
// recently for the others.
export function shelfBooks(db: DB, userId: string, shelf: ShelfName) {
  const when = (e: ShelfEntry) => (shelf === "read" ? e.readAt ?? e.addedAt : e.addedAt) ?? "";
  return (db.shelves[userId] ?? [])
    .filter((e) => e.shelf === shelf)
    .sort((a, b) => when(b).localeCompare(when(a)))
    .map((entry) => ({ entry, book: db.books.find((b) => b.id === entry.bookId) }))
    .filter((x) => x.book);
}
