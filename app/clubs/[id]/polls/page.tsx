"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useClub, useStore } from "@/lib/store";
import { formatDay } from "@/lib/format";
import { BookSearch } from "@/components/book-search";
import { AvatarStack, BookCover, Button, Card, Pill, SectionTitle, SparkleIcon, TopBar, cx } from "@/components/ui";

export default function Polls({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, isHost, db } = useClub(id);
  const { mutate } = useStore();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  if (!club) return null;

  const open = club.polls.find((p) => p.status === "open");
  const past = club.polls.filter((p) => p.status === "closed");
  const total = open?.options.reduce((n, o) => n + o.votes.length, 0) ?? 0;
  const myVote = open?.options.find((o) => o.votes.includes(db.meId))?.bookId;

  return (
    <>
      <TopBar title="Polls" back={`/clubs/${id}`} />
      <main className="px-4">
        {open ? (
          <>
            <SectionTitle>Vote for the next book</SectionTitle>
            <div className="space-y-3">
              {open.options.map((o) => {
                const book = db.books.find((b) => b.id === o.bookId);
                const share = total ? Math.round((o.votes.length / total) * 100) : 0;
                const mine = myVote === o.bookId;
                return (
                  <button
                    key={o.bookId}
                    onClick={() => mutate((d) => actions.vote(d, id, open.id, o.bookId))}
                    className={cx("relative block w-full overflow-hidden rounded-2xl border bg-card p-3 text-left transition", mine ? "border-accent ring-2 ring-accent/20" : "border-line")}
                  >
                    <div className="absolute inset-y-0 left-0 bg-accent-soft transition-all" style={{ width: `${share}%` }} />
                    <div className="relative flex items-center gap-3">
                      <BookCover book={book} width={48} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{book?.title}</p>
                        <p className="text-sm text-muted">
                          {book?.author}
                          {book?.pages ? ` · ${book.pages} pages` : ""}
                        </p>
                        <div className="mt-1.5">
                          <AvatarStack users={o.votes.map((v) => db.users.find((u) => u.id === v))} max={5} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-xl font-semibold">{share}%</p>
                        {mine && <p className="text-xs font-medium text-accent">Your vote</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 px-1 text-sm text-muted">Tap a book to vote. You can change your vote until the host closes the poll.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSearching(true)}>
                Suggest a book
              </Button>
              {isHost && (
                <Button
                  className="flex-1"
                  disabled={total === 0}
                  onClick={() => {
                    mutate((d) => actions.closePoll(d, id, open.id));
                    router.push(`/clubs/${id}/cohost`);
                  }}
                >
                  Close poll
                </Button>
              )}
            </div>
            {isHost && <p className="mt-2 px-1 text-xs text-muted">Closing the poll makes the winner your current book, and your co-host drafts a reading plan.</p>}
          </>
        ) : (
          <Card className="mt-4 text-center">
            <h2 className="font-serif text-xl font-semibold">No poll running</h2>
            <p className="mt-1 text-sm text-muted">{isHost ? "Start one when you're ready to choose the next book." : "Your host will open one when it's time to pick the next book."}</p>
            {isHost && (
              <div className="mt-4 space-y-2">
                <Button
                  variant="ai"
                  className="w-full"
                  onClick={() => {
                    mutate((d) => actions.askCohost(d, id, "shortlist"));
                    router.push(`/clubs/${id}/cohost`);
                  }}
                >
                  <SparkleIcon /> Ask your co-host for a shortlist
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    mutate((d) => actions.openPoll(d, id, []));
                    setSearching(true);
                  }}
                >
                  Pick the books myself
                </Button>
              </div>
            )}
          </Card>
        )}

        {past.length > 0 && (
          <>
            <SectionTitle>Past polls</SectionTitle>
            <div className="space-y-2">
              {past.map((p) => {
                const winner = db.books.find((b) => b.id === p.winnerBookId);
                return (
                  <Card key={p.id} className="flex items-center gap-3">
                    <BookCover book={winner} width={36} />
                    <div className="flex-1">
                      <p className="font-medium">{winner?.title}</p>
                      <p className="text-xs text-muted">
                        Won {formatDay(p.createdAt)} · {p.options.length} choices
                      </p>
                    </div>
                    <Pill tone="accent">Winner</Pill>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
      {searching && (
        <BookSearch
          onClose={() => setSearching(false)}
          onPick={(book) => {
            mutate((d) => {
              const poll = d.clubs.find((c) => c.id === id)?.polls.find((p) => p.status === "open");
              if (poll) actions.addPollOption(d, id, poll.id, book);
            });
            setSearching(false);
          }}
        />
      )}
    </>
  );
}
