"use client";

import { useState } from "react";
import Link from "next/link";
import { actions, useStore } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import { notSetUp, sendJoinRequest } from "@/lib/join-requests";
import { Button, ClubImage, Card, Pill, TopBar, cx, inputClass } from "@/components/ui";

export default function Directory() {
  const { db, mutate, act } = useStore();
  // The club whose "Ask to join" is open, with an optional hello to the host.
  const [asking, setAsking] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send(clubId: string) {
    setSending(true);
    setError("");
    let err = await act(
      (supabase) => sendJoinRequest(supabase, clubId, note),
      (d) => actions.requestToJoin(d, clubId),
    );
    // Database not set up for requests yet: remember it on this device, as before.
    if (err && notSetUp(err)) {
      mutate((d) => actions.requestToJoin(d, clubId));
      err = null;
    }
    setSending(false);
    if (err) return setError(err);
    setAsking("");
    setNote("");
  }
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
            const declined = db.declined?.includes(club.id);
            const spots = club.sizeCap - club.members.length;
            return (
              <Card key={club.id}>
                <div className="flex gap-3">
                  <ClubImage club={club} books={db.books} width={56} />
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
                  ) : declined ? (
                    <span className="text-sm text-muted">Not this time</span>
                  ) : asking === club.id ? null : (
                    <Button
                      size="sm"
                      variant={requested ? "secondary" : "primary"}
                      disabled={requested || spots <= 0}
                      onClick={() => {
                        setAsking(club.id);
                        setError("");
                      }}
                    >
                      {requested ? "Request sent" : "Ask to join"}
                    </Button>
                  )}
                </div>
                {asking === club.id && !mine && !requested && (
                  <div className="mt-3">
                    <label className="text-sm font-medium" htmlFor={`note-${club.id}`}>
                      Say hi to the host <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                      id={`note-${club.id}`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="What you like to read, or why this club caught your eye"
                      className={cx(inputClass, "mt-1.5 resize-none")}
                    />
                    {error && (
                      <p role="alert" className="mt-1.5 text-sm text-danger">
                        {error}
                      </p>
                    )}
                    <div className="mt-2 flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setAsking("")} disabled={sending}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => send(club.id)} disabled={sending}>
                        {sending ? "Sending…" : "Send request"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
