"use client";

import { useState } from "react";
import { STEPS } from "@/lib/progress";
import type { Book, Meetup } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

export type MeetupInput = { date: string; place: string; videoLink?: string; upTo: number };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Split an ISO date into the local values the date and time inputs expect.
function localParts(iso: string) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return localParts(d.toISOString()).date;
}

// The form behind both "Schedule" (no meetup) and "Edit" (an existing meetup).
export function MeetupForm({
  meetup,
  book,
  onCancel,
  onSave,
}: {
  meetup?: Meetup;
  book?: Book;
  onCancel: () => void;
  onSave: (input: MeetupInput) => void;
}) {
  const start = meetup ? localParts(meetup.date) : undefined;
  const [date, setDate] = useState(start?.date ?? defaultDate);
  const [time, setTime] = useState(start?.time ?? "19:00");
  const [place, setPlace] = useState(meetup?.place ?? "");
  const [videoLink, setVideoLink] = useState(meetup?.videoLink ?? "");
  const [upTo, setUpTo] = useState(meetup?.upTo ?? 100);

  return (
    <div className="space-y-3">
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
      {!videoLink && (
        <a href="https://meet.google.com/new" target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-accent">
          Create a Google Meet link ↗
        </a>
      )}
      {book && (
        <Field label="Read up to">
          <select value={upTo} onChange={(e) => setUpTo(Number(e.target.value))} className={inputClass}>
            {STEPS.map((n) => (
              <option key={n} value={n}>
                {n === 100 ? "The whole book" : `${n}% of the book`}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          {meetup ? "Discard" : "Cancel"}
        </Button>
        <Button
          className="flex-1"
          disabled={!place.trim() || !date || !time}
          onClick={() => onSave({ date: new Date(`${date}T${time}`).toISOString(), place: place.trim(), videoLink: videoLink.trim() || undefined, upTo })}
        >
          {meetup ? "Save changes" : "Schedule"}
        </Button>
      </div>
    </div>
  );
}
