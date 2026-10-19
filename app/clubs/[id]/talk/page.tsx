"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { actions, useClub, useStore } from "@/lib/store";
import { timeAgo, uid } from "@/lib/format";
import { ProgressPicker } from "@/components/progress-picker";
import { Button, Card, Field, Pill, SectionTitle, TopBar, inputClass } from "@/components/ui";

export default function Talk({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, book, me } = useClub(id);
  const { mutate } = useStore();
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [gate, setGate] = useState(me?.progress ?? 0);
  if (!club) return null;

  const progress = me?.progress ?? 0;
  const label = book?.sectionLabel ?? "Chapter";
  const threads = club.threads.filter((t) => !t.bookId || t.bookId === club.currentBookId).sort((a, b) => a.gate - b.gate);

  return (
    <>
      <TopBar title="Talk" back={`/clubs/${id}`} />
      <main className="px-4">
        {book && me && (
          <Card className="mt-4">
            <ProgressPicker clubId={id} book={book} progress={progress} />
          </Card>
        )}

        <SectionTitle action={<button onClick={() => setComposing(true)} className="text-sm font-medium text-accent">New topic</button>}>
          Discussion
        </SectionTitle>

        {composing && (
          <Card className="mb-3 space-y-3">
            <Field label="Topic">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to talk about?" className={inputClass} />
            </Field>
            {book && (
              <Field label="Contains spoilers up to" hint="Only members who have read this far will see it.">
                <select value={gate} onChange={(e) => setGate(Number(e.target.value))} className={inputClass}>
                  <option value={0}>No spoilers</option>
                  {Array.from({ length: book.sections }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {label} {n}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!title.trim()}
                onClick={() => {
                  const threadId = uid("t");
                  mutate((d) => actions.addThread(d, id, threadId, title.trim(), gate));
                  router.push(`/clubs/${id}/talk/${threadId}`);
                }}
              >
                Start topic
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {threads.map((t) => {
            const locked = t.gate > progress;
            const last = t.posts.at(-1);
            return (
              <Link key={t.id} href={`/clubs/${id}/talk/${t.id}`} className="block">
                <Card className={locked ? "bg-paper" : ""}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={locked ? "font-medium text-muted" : "font-medium"}>{locked ? `Spoilers for ${label.toLowerCase()} ${t.gate}` : t.title}</p>
                    {locked ? <Pill tone="warn">Locked</Pill> : t.gate > 0 ? <Pill>{`${label} ${t.gate}`}</Pill> : <Pill tone="accent">Spoiler-free</Pill>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {locked
                      ? `Opens when you've read up to ${label.toLowerCase()} ${t.gate}`
                      : last
                        ? `${t.posts.length} message${t.posts.length > 1 ? "s" : ""} · ${timeAgo(last.at)}`
                        : "No messages yet"}
                  </p>
                </Card>
              </Link>
            );
          })}
          {threads.length === 0 && <Card className="text-center text-sm text-muted">No topics yet. Start one!</Card>}
        </div>
      </main>
    </>
  );
}
