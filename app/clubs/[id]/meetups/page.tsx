"use client";

import { use, useState } from "react";
import { actions, useClub, useStore } from "@/lib/store";
import { MeetupCard } from "@/components/meetup-card";
import { Button, Card, Field, SectionTitle, TopBar, inputClass } from "@/components/ui";

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function Meetups({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: startNew } = use(searchParams);
  const { club, book, isHost } = useClub(id);
  const { mutate } = useStore();
  const [composing, setComposing] = useState(startNew === "1");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("19:00");
  const [place, setPlace] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [upTo, setUpTo] = useState(book?.sections ?? 1);
  if (!club) return null;

  const now = new Date();
  const upcoming = club.meetups.filter((m) => new Date(m.date) >= now);
  const past = club.meetups.filter((m) => new Date(m.date) < now);

  return (
    <>
      <TopBar
        title="Meetups"
        back={`/clubs/${id}`}
        right={
          isHost && !composing ? (
            <Button size="sm" variant="secondary" onClick={() => setComposing(true)}>
              Schedule
            </Button>
          ) : null
        }
      />
      <main className="px-4">
        {composing && (
          <Card className="mt-4 space-y-3">
            <h2 className="font-serif text-lg font-semibold">New meetup</h2>
            <div className="flex gap-2">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Time">
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Where">
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Someone's place, a café, or Video call" className={inputClass} />
            </Field>
            <Field label="Video link (optional)" hint="Paste a Zoom or Google Meet link for anyone joining remotely.">
              <input value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://" className={inputClass} />
            </Field>
            {book && (
              <Field label="Read up to">
                <select value={upTo} onChange={(e) => setUpTo(Number(e.target.value))} className={inputClass}>
                  {Array.from({ length: book.sections }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {book.sectionLabel} {n}
                      {n === book.sections ? " (the end)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!place.trim() || !date}
                onClick={() => {
                  mutate((d) => actions.addMeetup(d, id, { date: new Date(`${date}T${time}`).toISOString(), place: place.trim(), videoLink: videoLink.trim() || undefined, upTo }));
                  setComposing(false);
                  setPlace("");
                  setVideoLink("");
                }}
              >
                Schedule
              </Button>
            </div>
          </Card>
        )}

        <SectionTitle>Coming up</SectionTitle>
        <div className="space-y-3">
          {upcoming.map((m) => (
            <MeetupCard key={m.id} club={club} meetup={m} book={book} />
          ))}
          {upcoming.length === 0 && <Card className="text-center text-sm text-muted">Nothing scheduled yet.</Card>}
        </div>

        {past.length > 0 && (
          <>
            <SectionTitle>Past</SectionTitle>
            <div className="space-y-3">
              {past.map((m) => (
                <MeetupCard key={m.id} club={club} meetup={m} book={book} compact />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
