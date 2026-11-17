"use client";

import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { answerJoinRequest, pendingRequests } from "@/lib/join-requests";
import { timeAgo } from "@/lib/format";
import type { Club } from "@/lib/types";
import { Avatar, Button, Card, SectionTitle } from "./ui";

// On the club page, for hosts: people who asked to join from the directory.
export function JoinRequests({ club }: { club: Club }) {
  const { db, act } = useStore();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const requests = pendingRequests(club);
  if (!requests.length) return null;
  const full = club.members.length >= club.sizeCap;

  async function answer(userId: string, approve: boolean) {
    setBusy(userId);
    setError("");
    const err = await act(
      (supabase) => answerJoinRequest(supabase, club.id, userId, approve),
      (d) => actions.answerJoinRequest(d, club.id, userId, approve),
    );
    setBusy("");
    if (err) setError(err);
  }

  return (
    <section id="join-requests">
      <SectionTitle>Asking to join · {requests.length}</SectionTitle>
      <div className="space-y-3">
        {requests.map((r) => {
          const u = db.users.find((x) => x.id === r.userId);
          return (
            <Card key={r.userId}>
              <div className="flex items-center gap-3">
                <Avatar user={u} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u?.name ?? "A reader"}</p>
                  <p className="text-xs text-muted">Asked {timeAgo(r.at)} from the directory</p>
                </div>
              </div>
              {r.note && <p className="mt-3 whitespace-pre-line border-l-2 border-line pl-3 text-[15px] leading-relaxed">{r.note}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={!!busy || full} onClick={() => answer(r.userId, true)}>
                  {busy === r.userId ? "…" : "Approve"}
                </Button>
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => answer(r.userId, false)}>
                  Decline
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {full && <p className="mt-2 px-1 text-sm text-muted">Your club is full ({club.sizeCap} people), so you can&apos;t approve anyone right now.</p>}
      {error && (
        <p role="alert" className="mt-2 px-1 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-2 px-1 text-xs text-muted">Approving adds them to the club and emails them. Declining sends no email, and they can&apos;t ask again.</p>
    </section>
  );
}
