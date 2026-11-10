import type { Book, Club, DB } from "./types";

export type PopularBook = { book: Book; memberIds: string[] };

// Books on two or more members' want-to-read shelves, most wanted first.
// Leaves out what the club is reading now and anything it has already read
// (past reads and poll winners), since those aren't "next book" candidates.
export function popularInClub(club: Club, db: Pick<DB, "shelves" | "books">, minMembers = 2): PopularBook[] {
  const done = new Set<string>([
    ...(club.currentBookId ? [club.currentBookId] : []),
    ...(club.pastReads ?? []).map((r) => r.bookId),
    ...club.polls.flatMap((p) => (p.winnerBookId ? [p.winnerBookId] : [])),
  ]);
  const wanted = new Map<string, string[]>();
  for (const m of club.members) {
    for (const entry of db.shelves[m.userId] ?? []) {
      if (entry.shelf !== "to-read" || done.has(entry.bookId)) continue;
      const ids = wanted.get(entry.bookId) ?? [];
      if (!ids.includes(m.userId)) ids.push(m.userId);
      wanted.set(entry.bookId, ids);
    }
  }
  return [...wanted.entries()]
    .filter(([, ids]) => ids.length >= minMembers)
    .map(([id, memberIds]) => ({ book: db.books.find((b) => b.id === id)!, memberIds }))
    .filter((x) => x.book)
    .sort((a, b) => b.memberIds.length - a.memberIds.length || a.book.title.localeCompare(b.book.title));
}
