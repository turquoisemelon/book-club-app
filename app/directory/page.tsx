"use client";

import { useState } from "react";
import Link from "next/link";
import { actions, useStore } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import { BookCover, Button, Card, Pill, TopBar, cx } from "@/components/ui";

export default function Directory() {
  const { db, mutate } = useStore();
  const open = db.clubs.filter((c) => c.openToMembers);
  const areas = ["All", ...Array.from(new Set(open.map((c) => c.neighbourhood)))];
  const [area, setArea] = useState("All");
  const shown = open.filter((c) => area === "All" || c.neighbourhood === area);

  return (
    <>
      <TopBar title="Clubs near you" back="/" />
      <main className="px-4 pb-10">
        <p className="mt-3 px-1 text-sm text-muted">Clubs in your city that are open to new members. Ask to join and the host gets back to you.</p>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {areas.map((a) => (
            <button key={a} onClick={() => setArea(a)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", area === a ? "border-accent bg-accent text-white" : "border-line bg-card")}>
              {a}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {shown.map((club) => {
            const book = db.books.find((b) => b.id === club.currentBookId);
            const next = club.meetups.find((m) => new Date(m.date) > new Date());
            const mine = club.members.some((m) => m.userId === db.meId);
            const requested = db.requested.includes(club.id);
            const spots = club.sizeCap - club.members.length;
            return (
              <Card key={club.id}>
                <div className="flex gap-3">
                  <BookCover book={book} width={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold leading-tight">{club.name}</h3>
                      {mine && <Pill tone="accent">Your club</Pill>}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug">{club.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill>{club.neighbourhood}</Pill>
                      <Pill>{club.cadence}</Pill>
                      <Pill tone={spots <= 2 ? "warn" : "neutral"}>{spots > 0 ? `${spots} spot${spots > 1 ? "s" : ""} left` : "Full"}</Pill>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <p className="text-xs text-muted">
                    {book ? `Reading ${book.title}` : ""}
                    {next ? ` · meets ${daysUntil(next.date)}` : ""}
                  </p>
                  {mine ? (
                    <Link href={`/clubs/${club.id}`} className="text-sm font-medium text-accent">
                      Open
                    </Link>
                  ) : (
                    <Button size="sm" variant={requested ? "secondary" : "primary"} disabled={requested || spots <= 0} onClick={() => mutate((d) => actions.requestToJoin(d, club.id))}>
                      {requested ? "Request sent" : "Ask to join"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
