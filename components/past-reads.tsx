"use client";

import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { formatDay, formatTime } from "@/lib/format";
import type { Club } from "@/lib/types";
import { BookCover, Button, Card, Field, SectionTitle, inputClass } from "./ui";

export function PastReads({ club, isHost }: { club: Club; isHost: boolean }) {
  const { db, mutate } = useStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const reads = club.pastReads ?? [];

  if (!isHost && reads.length === 0) return null;

  const close = () => {
    setAdding(false);
    setTitle("");
    setAuthor("");
    setDate("");
  };

  return (
    <>
      <SectionTitle
        action={
          isHost && !adding ? (
            <button onClick={() => setAdding(true)} className="text-sm font-medium text-accent">
              Add
            </button>
          ) : null
        }
      >
        Past reads
      </SectionTitle>

      {adding && (
        <Card className="mb-3 space-y-3">
          <h2 className="font-serif text-lg font-semibold">Add a book you&apos;ve read</h2>
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Author (optional)">
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} />
          </Field>
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
            <Button
              className="flex-1"
              disabled={!title.trim() || !date}
              onClick={() => {
                mutate((d) => actions.addPastRead(d, club.id, { title, author, metAt: new Date(`${date}T${time || "00:00"}`).toISOString() }));
                close();
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      )}

      {reads.length > 0 ? (
        <div className="space-y-3">
          {reads.map((r) => {
            const book = db.books.find((b) => b.id === r.bookId);
            return (
              <Card key={r.id} className="flex items-center gap-3">
                <BookCover book={book} width={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{book?.title}</p>
                  <p className="truncate text-sm text-muted">
                    {book?.author ? `${book.author} · ` : ""}Met {formatDay(r.metAt)}, {formatTime(r.metAt)}
                  </p>
                </div>
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
        !adding && <Card className="text-center text-sm text-muted">Add books your club read before joining the app.</Card>
      )}
    </>
  );
}
