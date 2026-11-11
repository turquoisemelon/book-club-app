"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore, useClub } from "@/lib/store";
import { SHELVES, shelfBooks } from "@/lib/shelves";
import { progressLabel, snapDown } from "@/lib/progress";
import { ShelfBook } from "@/components/shelf";
import { Avatar, BookCover, ButtonLink, Card, ClubImage, SectionTitle, TopBar } from "@/components/ui";

const ROW = 12;

// A clubmate's profile, opened by tapping their avatar in a club. Shows what
// the database already lets clubmates see: their shelves, where they are in
// this club's book, and the clubs you share. Nobody outside your clubs can
// open it, because their shelves and memberships aren't visible to them.
export default function MemberProfile({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = use(params);
  const { club, book } = useClub(id);
  const { db } = useStore();
  if (!club) return null;

  const user = db.users.find((u) => u.id === userId);
  const membership = club.members.find((m) => m.userId === userId);
  const back = `/clubs/${id}`;

  if (!user || !membership) {
    return (
      <>
        <TopBar title="Member" back={back} />
        <main className="px-4">
          <Card className="mt-4 text-center text-sm text-muted">This person isn&apos;t in {club.name} anymore.</Card>
        </main>
      </>
    );
  }

  const isMe = userId === db.meId;
  const shared = db.clubs.filter((c) => c.members.some((m) => m.userId === userId) && c.members.some((m) => m.userId === db.meId));
  const shelves = SHELVES.map((s) => ({ ...s, books: shelfBooks(db, userId, s.id) }));
  const mine = new Set((db.shelves[db.meId] ?? []).filter((e) => e.shelf === "to-read").map((e) => e.bookId));
  const bothWant = isMe ? [] : shelfBooks(db, userId, "to-read").filter(({ entry }) => mine.has(entry.bookId));
  const hasBooks = shelves.some((s) => s.books.length);

  return (
    <>
      <TopBar title={isMe ? "Your profile" : user.name} back={back} />
      <main className="px-4 pb-6">
        <div className="mt-6 flex flex-col items-center text-center">
          <Avatar user={user} size={96} />
          <h2 className="mt-3 font-serif text-2xl font-semibold">{user.name}</h2>
          <p className="text-sm text-muted">
            {membership.role === "host" ? "Host" : "Member"} of {club.name}
          </p>
          {isMe && (
            <div className="mt-3 flex gap-2">
              <ButtonLink href="/account" size="sm" variant="secondary">
                Edit profile
              </ButtonLink>
              <ButtonLink href="/books" size="sm" variant="secondary">
                Your books
              </ButtonLink>
            </div>
          )}
        </div>

        {book && (
          <>
            <SectionTitle>Reading with {club.name}</SectionTitle>
            <Card className="flex items-center gap-3">
              <BookCover book={book} width={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{book.title}</p>
                <p className="text-sm text-muted">{progressLabel(membership.progress)}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${snapDown(membership.progress)}%` }} />
                </div>
              </div>
            </Card>
          </>
        )}

        {bothWant.length > 0 && (
          <>
            <SectionTitle>You both want to read · {bothWant.length}</SectionTitle>
            <BookRow books={bothWant} />
          </>
        )}

        {shared.some((c) => c.id !== id) ? (
          <>
            <SectionTitle>{isMe ? "Your clubs" : "Clubs you share"} · {shared.length}</SectionTitle>
            <div className="space-y-2">
              {shared.map((c) => (
                <Link key={c.id} href={`/clubs/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 active:bg-paper">
                  <ClubImage club={c} books={db.books} width={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.members.length} members{c.members.find((m) => m.userId === userId)?.role === "host" ? ` · ${isMe ? "you host" : "they host"}` : ""}
                    </p>
                  </div>
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : null}

        {shelves.map((s) =>
          s.books.length ? (
            <div key={s.id}>
              <SectionTitle>
                {s.label} · {s.books.length}
              </SectionTitle>
              <BookRow books={s.books} />
            </div>
          ) : null,
        )}
        {!hasBooks && (
          <>
            <SectionTitle>Books</SectionTitle>
            <Card className="text-center text-sm text-muted">
              {isMe ? "Your shelves are empty. Import from Goodreads to fill them." : `${user.name} hasn't added any books yet.`}
            </Card>
          </>
        )}
      </main>
    </>
  );
}

// A row of covers that scrolls sideways. Long shelves show the first dozen
// and a "Show all" that opens them up as a grid.
function BookRow({ books }: { books: ReturnType<typeof shelfBooks> }) {
  const [all, setAll] = useState(false);
  if (all) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] justify-items-center gap-x-3 gap-y-5">
        {books.map(({ book, entry }) => (
          <ShelfBook key={entry.bookId} book={book!} entry={entry} width={84} />
        ))}
      </div>
    );
  }
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {books.slice(0, ROW).map(({ book, entry }) => (
        <ShelfBook key={entry.bookId} book={book!} entry={entry} width={84} />
      ))}
      {books.length > ROW && (
        <button
          onClick={() => setAll(true)}
          className="flex w-[84px] shrink-0 items-center justify-center rounded-md border border-dashed border-line text-center text-xs font-medium text-accent"
          style={{ height: 126 }}
        >
          Show all {books.length}
        </button>
      )}
    </div>
  );
}
