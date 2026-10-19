"use client";

import { use, useState } from "react";
import { actions, useClub, useStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import type { Draft, DraftKind } from "@/lib/types";
import { Button, Card, Pill, SectionTitle, SparkleIcon, TopBar, cx, inputClass } from "@/components/ui";

const destination: Record<DraftKind, string> = {
  questions: "Posts as a new discussion topic",
  reminder: "Posts as an announcement",
  shortlist: "Opens a poll with these books",
  schedule: "Posts as an announcement",
  recap: "Posts as an announcement",
};

function DraftCard({ clubId, draft, sectionLabel }: { clubId: string; draft: Draft; sectionLabel: string }) {
  const { mutate } = useStore();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(draft.body);

  return (
    <Card className="border-ai/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{draft.title}</p>
          <p className="text-xs text-muted">
            {timeAgo(draft.createdAt)} · {destination[draft.kind]}
            {draft.kind === "questions" && draft.gate ? `, unlocked at ${sectionLabel} ${draft.gate}` : ""}
          </p>
        </div>
        <Pill tone="ai">Draft</Pill>
      </div>
      {editing ? (
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(14, body.split("\n").length + 2)} className={cx(inputClass, "mt-3 text-[14px] leading-relaxed")} />
      ) : (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-paper p-3 text-[14px] leading-relaxed">{body}</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" className="text-muted" onClick={() => mutate((d) => actions.discardDraft(d, clubId, draft.id))}>
          Discard
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
          {editing ? "Done editing" : "Edit"}
        </Button>
        <Button size="sm" onClick={() => mutate((d) => actions.approveDraft(d, clubId, draft.id, body))}>
          Approve
        </Button>
      </div>
    </Card>
  );
}

export default function Cohost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, book, isHost } = useClub(id);
  const { mutate } = useStore();
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  if (!club) return null;

  if (!isHost) {
    return (
      <>
        <TopBar title="Co-host" back={`/clubs/${id}`} />
        <p className="p-8 text-center text-sm text-muted">Only the host sees the co-host. Switch to host view on the home screen.</p>
      </>
    );
  }

  const pending = club.drafts.filter((d) => d.status === "pending");
  const history = club.drafts.filter((d) => d.status !== "pending").slice(0, 6);
  const next = club.meetups.find((m) => new Date(m.date) > new Date());
  const label = book?.sectionLabel.toLowerCase() ?? "chapter";

  const asks: { kind: DraftKind; title: string; detail: string; disabled?: string }[] = [
    { kind: "questions", title: "Discussion questions", detail: next && book ? `For ${label}s 1 to ${next.upTo}, spoiler-safe` : "For your current book", disabled: book ? undefined : "Pick a book first" },
    { kind: "reminder", title: "Meetup reminder", detail: "With who's coming and the reading", disabled: next ? undefined : "Schedule a meetup first" },
    { kind: "shortlist", title: "Next book shortlist", detail: "From members' want-to-read shelves" },
    { kind: "recap", title: "Meetup recap", detail: "From your rough notes" },
  ];

  return (
    <>
      <TopBar title="Co-host" back={`/clubs/${id}`} />
      <main className="px-4">
        <div className="mt-4 rounded-2xl bg-ai-soft p-4 text-ai">
          <div className="flex items-center gap-2 font-semibold">
            <SparkleIcon size={18} /> Your co-host drafts, you decide
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ai/90">Nothing it writes reaches your members until you approve it. Edit anything you like first.</p>
        </div>

        <SectionTitle>Waiting for you{pending.length ? ` · ${pending.length}` : ""}</SectionTitle>
        <div className="space-y-3">
          {pending.map((d) => (
            <DraftCard key={d.id} clubId={id} draft={d} sectionLabel={label} />
          ))}
          {pending.length === 0 && <Card className="text-center text-sm text-muted">All caught up. Ask for something below.</Card>}
        </div>

        <SectionTitle>Ask your co-host</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {asks.map((a) => (
            <button
              key={a.kind}
              disabled={Boolean(a.disabled)}
              onClick={() => {
                if (a.kind === "recap") {
                  setShowNotes(true);
                  return;
                }
                mutate((d) => actions.askCohost(d, id, a.kind));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-2xl border border-line bg-card p-3 text-left transition active:bg-ai-soft disabled:opacity-50"
            >
              <SparkleIcon size={16} />
              <p className="mt-2 font-medium leading-tight">{a.title}</p>
              <p className="mt-0.5 text-xs text-muted">{a.disabled ?? a.detail}</p>
            </button>
          ))}
        </div>

        {showNotes && (
          <Card className="mt-3 space-y-3">
            <p className="font-medium">Paste your notes from the meetup</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder={"Everyone loved Klara's voice\nDebate about whether the ending was hopeful\nPriya hosts next time"}
              className={inputClass}
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowNotes(false)}>
                Cancel
              </Button>
              <Button
                variant="ai"
                size="sm"
                disabled={!notes.trim()}
                onClick={() => {
                  mutate((d) => actions.askCohost(d, id, "recap", { notes }));
                  setNotes("");
                  setShowNotes(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <SparkleIcon size={14} /> Draft recap
              </Button>
            </div>
          </Card>
        )}

        {history.length > 0 && (
          <>
            <SectionTitle>Recently</SectionTitle>
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl px-1 py-1.5 text-sm">
                  <span className="truncate">{d.title}</span>
                  <Pill tone={d.status === "approved" ? "accent" : "neutral"}>{d.status === "approved" ? "Posted" : "Discarded"}</Pill>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 px-1 text-xs leading-relaxed text-muted">
          Prototype note: these drafts are written from templates so you can try the flow. In the real app, Claude writes them from your club&apos;s books, schedule and notes.
        </p>
      </main>
    </>
  );
}
