"use client";

import { useRouter } from "next/navigation";
import { actions, useStore } from "@/lib/store";
import { popularInClub } from "@/lib/popular";
import type { Club } from "@/lib/types";
import { AvatarStack, BookCover, SectionTitle } from "./ui";

// "Popular in your club": books several members want to read, from their
// want-to-read shelves. Hosts can turn the top few into a poll in one tap.
export function PopularInClub({ club, isHost }: { club: Club; isHost: boolean }) {
  const { db, mutate } = useStore();
  const router = useRouter();
  const popular = popularInClub(club, db);
  if (!popular.length) return null;

  const hasOpenPoll = club.polls.some((p) => p.status === "open");
  const pollPicks = popular.slice(0, 3).map((p) => p.book.id);
  const canPoll = isHost && !hasOpenPoll && pollPicks.length >= 2;

  return (
    <>
      <SectionTitle
        action={
          canPoll ? (
            <button
              onClick={() => {
                mutate((d) => actions.openPoll(d, club.id, pollPicks));
                router.push(`/clubs/${club.id}/polls`);
              }}
              className="text-sm font-medium text-accent"
            >
              Poll the top {pollPicks.length}
            </button>
          ) : null
        }
      >
        Popular in your club
      </SectionTitle>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {popular.slice(0, 12).map(({ book, memberIds }) => {
          const users = memberIds.map((id) => db.users.find((u) => u.id === id));
          const names = users.map((u) => u?.name).filter(Boolean).join(", ");
          return (
            <div key={book.id} className="w-[96px] shrink-0" title={names ? `Want to read: ${names}` : undefined}>
              <BookCover book={book} width={96} />
              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-tight">{book.title}</p>
              <p className="truncate text-xs text-muted">{book.author}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <AvatarStack users={users} max={3} />
              </div>
              <p className="mt-1 text-xs text-muted">{memberIds.length} want to read</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
