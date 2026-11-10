"use client";

import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { formatDay, formatTime } from "@/lib/format";
import type { Club, PastRead } from "@/lib/types";
import { CoverPicker } from "./cover-picker";
import { BookCover, Button, Card, Field, SectionTitle, inputClass } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");

// Splits a saved meeting time into the local date and time the inputs show.
function localParts(iso: string) {
  const d = new Date(iso);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export function PastReads({ club, isHost }: { club: Club; isHost: boolean }) {
  const { db, mutate } = useStore();
  // "new" while adding a book, a past read's id while editing it.
  const [open, setOpen] = useState<string>();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [cover, setCover] = useState<string>();
  const reads = club.pastReads ?? [];

  if (!isHost && reads.length === 0) return null;

  const close = () => {
    setOpen(undefined);
    setTitle("");
    setAuthor("");
    setDate("");
    setTime("20:00");
    setCover(undefined);
  };

  const startEdit = (r: PastRead) => {
    const book = db.books.find((b) => b.id === r.bookId);
    const parts = localParts(r.metAt);
    setTitle(book?.title ?? "");
    setAuthor(book?.author ?? "");
    setCover(book?.cover);
    setDate(parts.date);
    setTime(parts.time);
    setOpen(r.id);
  };

  const save = () => {
    const input = { title, author, cover, metAt: new Date(`${date}T${time || "00:00"}`).toISOString() };
    const id = open;
    mutate((d) => {
      if (id === "new") actions.addPastRead(d, club.id, input);
      else if (id) actions.updatePastRead(d, club.id, id, input);
    });
    close();
  };

  const form = (
    <Card className="mb-3 space-y-3">
      <h2 className="font-serif text-lg font-semibold">{open === "new" ? "Add a book you've read" : "Edit past read"}</h2>
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Author (optional)">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} />
      </Field>
      <CoverPicker title={title} author={author} value={cover} onChange={setCover} />
      <div className="flex gap-2">
        <Field label="Meeting date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Time">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={close}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={!title.trim() || !date} onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  );

  return (
    <>
      <SectionTitle
        action={
          isHost && !open ? (
            <button onClick={() => setOpen("new")} className="text-sm font-medium text-accent">
              Add
            </button>
          ) : null
        }
      >
        Past reads
      </SectionTitle>

      {open === "new" && form}

      {reads.length > 0 ? (
        <div className="space-y-3">
          {reads.map((r) => {
            if (open === r.id) return <div key={r.id}>{form}</div>;
            const book = db.books.find((b) => b.id === r.bookId);
            const details = (
              <>
                <BookCover book={book} width={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{book?.title}</p>
                  <p className="truncate text-sm text-muted">
                    {book?.author ? `${book.author} · ` : ""}Met {formatDay(r.metAt)}, {formatTime(r.metAt)}
                  </p>
                </div>
              </>
            );
            return (
              <Card key={r.id} className="flex items-center gap-3">
                {isHost ? (
                  <button onClick={() => startEdit(r)} aria-label={`Edit ${book?.title ?? "past read"}`} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
                    {details}
                  </button>
                ) : (
                  details
                )}
                {isHost && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${book?.title ?? "this book"} from past reads?`)) mutate((d) => actions.removePastRead(d, club.id, r.id));
                    }}
                    className="text-sm text-muted"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        !open && <Card className="text-center text-sm text-muted">Add books your club read before joining the app.</Card>
      )}
      {isHost && reads.length > 0 && !open && <p className="mt-2 px-1 text-xs text-muted">Tap a book to edit its title, author, cover or date.</p>}
    </>
  );
}
