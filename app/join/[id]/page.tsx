"use client";

import { use, useState } from "react";
import Link from "next/link";
import { actions, useClub, useStore } from "@/lib/store";
import { daysUntil, formatDay } from "@/lib/format";
import { AvatarStack, BookCover, Button, Card, inputClass } from "@/components/ui";

export default function Join({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, book, db } = useClub(id);
  const { mutate, synced } = useStore();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  if (!club) {
    return (
      <p className="p-8 text-center text-sm text-muted">
        {synced ? "Joining private clubs with a link is coming in the next update." : "This invite link has expired or the club doesn't exist."}
      </p>
    );
  }

  const host = db.users.find((u) => u.id === club.members.find((m) => m.role === "host")?.userId);
  const next = club.meetups.find((m) => new Date(m.date) > new Date());

  return (
    <main className="px-5 pb-10 pt-10">
      <p className="text-center text-sm text-muted">{host?.name} invited you to</p>
      <h1 className="mt-1 text-center font-serif text-3xl font-semibold">{club.name}</h1>
      <p className="mt-2 text-center text-[15px] text-muted">{club.description}</p>
      <div className="mt-4 flex justify-center">
        <AvatarStack users={club.members.map((m) => db.users.find((u) => u.id === m.userId))} max={6} />
      </div>

      {book && (
        <Card className="mt-6 flex gap-4">
          <BookCover book={book} width={64} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reading now</p>
            <p className="mt-1 font-serif text-lg font-semibold leading-tight">{book.title}</p>
            <p className="text-sm text-muted">{book.author}</p>
          </div>
        </Card>
      )}
      {next && (
        <Card className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Next meetup</p>
          <p className="mt-1 font-medium">
            {formatDay(next.date)} ({daysUntil(next.date)})
          </p>
          <p className="text-sm text-muted">{next.place}</p>
        </Card>
      )}

      {joined ? (
        <Card className="mt-6 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 font-serif text-xl font-semibold">You&apos;re in, {name}!</p>
          <p className="mt-1 text-sm text-muted">In the real app you&apos;d land in the club now. In this preview, your host sees you in the members list.</p>
          <Link href={`/clubs/${id}`} className="mt-4 inline-block font-medium text-accent">
            Back to the club
          </Link>
        </Card>
      ) : synced && club.members.some((m) => m.userId === db.meId) ? (
        <Card className="mt-6 text-center">
          <p className="font-medium">You&apos;re already in this club.</p>
          <Link href={`/clubs/${id}`} className="mt-3 inline-block font-medium text-accent">
            Go to the club
          </Link>
        </Card>
      ) : synced ? (
        <Card className="mt-6 text-center text-sm text-muted">
          Joining with a link is coming in the next update. For now, ask the host to add you.
        </Card>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            mutate((d) => actions.joinClub(d, id, name.trim()));
            setJoined(true);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" className={inputClass} autoComplete="given-name" />
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Join the club
          </Button>
          <p className="text-center text-xs text-muted">No app to download. We&apos;ll email you a sign-in link next time.</p>
        </form>
      )}
    </main>
  );
}
