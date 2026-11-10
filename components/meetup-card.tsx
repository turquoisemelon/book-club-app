"use client";

import { actions, useStore } from "@/lib/store";
import { daysUntil, formatDay, formatTime } from "@/lib/format";
import { spanLabel } from "@/lib/progress";
import type { Book, Club, Meetup, Rsvp } from "@/lib/types";
import { AvatarStack, Card, Pill, cx } from "./ui";

const choices: { value: Rsvp; label: string }[] = [
  { value: "yes", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Can't" },
];

function icsFor(club: Club, meetup: Meetup, book?: Book) {
  const start = new Date(meetup.date);
  const end = new Date(start.getTime() + 2 * 3600000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chapter Club//EN",
    "BEGIN:VEVENT",
    `UID:${meetup.id}@bookclub`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${club.name}${book ? `: ${book.title}` : ""}`,
    `LOCATION:${meetup.place}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

export function MeetupCard({ club, meetup, book, compact }: { club: Club; meetup: Meetup; book?: Book; compact?: boolean }) {
  const { db, mutate } = useStore();
  const mine = meetup.rsvps[db.meId];
  const going = Object.entries(meetup.rsvps)
    .filter(([, r]) => r === "yes")
    .map(([id]) => db.users.find((u) => u.id === id));
  const past = new Date(meetup.date) < new Date();
  const d = new Date(meetup.date);

  return (
    <Card>
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-soft text-accent">
          <span className="text-[11px] font-semibold uppercase">{d.toLocaleDateString(undefined, { month: "short" })}</span>
          <span className="font-serif text-xl font-semibold leading-none">{d.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{formatDay(meetup.date)}</p>
            {!past && <Pill tone="accent">{daysUntil(meetup.date)}</Pill>}
          </div>
          <p className="text-sm text-muted">
            {formatTime(meetup.date)} · {meetup.place}
          </p>
          {book && (
            <p className="mt-1 text-sm">
              Read {spanLabel(meetup.upTo)}
            </p>
          )}
        </div>
      </div>

      {!past && (
        <div className="mt-4 flex gap-2">
          {choices.map((c) => (
            <button
              key={c.value}
              onClick={() => mutate((draft) => actions.rsvp(draft, club.id, meetup.id, c.value))}
              className={cx(
                "h-10 flex-1 rounded-full border text-sm font-medium transition",
                mine === c.value ? "border-accent bg-accent text-white" : "border-line bg-paper text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {!compact && (
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
          <div className="flex items-center gap-2">
            <AvatarStack users={going} max={5} />
            <span className="text-muted">{going.length} going</span>
          </div>
          <div className="flex gap-3">
            {meetup.videoLink && (
              <a href={meetup.videoLink} target="_blank" rel="noreferrer" className="font-medium text-accent">
                Video link
              </a>
            )}
            <a href={icsFor(club, meetup, book)} download={`${club.name}.ics`} className="font-medium text-accent">
              Add to calendar
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
