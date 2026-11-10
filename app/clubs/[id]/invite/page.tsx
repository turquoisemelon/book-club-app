"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useClub, useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { getInviteCode, inviteLink, resetInviteCode } from "@/lib/invites";
import { Button, Card, ClubImage, TopBar } from "@/components/ui";

export default function Invite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, book, db, isHost } = useClub(id);
  const { synced } = useStore();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  // Signed in, links carry the club's secret invite code.
  const [code, setCode] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!synced || !supabase) return;
    getInviteCode(supabase, id)
      .then((c) => (c ? setCode(c) : setLinkError("No invite link for this club yet. Run the latest database update (0003_invites.sql).")))
      .catch((e: Error) => setLinkError(e.message));
  }, [synced, id]);

  if (!club) return null;
  if (synced && !code) {
    return (
      <>
        <TopBar title="Invite people" back={`/clubs/${id}`} />
        <p className="px-5 pt-6 text-sm text-muted">{linkError || "Getting your invite link…"}</p>
      </>
    );
  }

  const link = synced && code ? inviteLink(origin, id, code) : `${origin}/join/${id}`;
  const message = `Join ${club.name} on Chapter Club${book ? `, we're reading ${book.title}` : ""}: ${link}`;

  return (
    <>
      <TopBar title="Invite people" back={`/clubs/${id}`} />
      <main className="px-4 pt-4">
        <p className="px-1 text-[15px] leading-relaxed">
          {synced
            ? "Send this link to anyone you want in the club. They tap it, sign in with their email, and they're in. No app or password needed."
            : "Send this link to anyone you want in the club. They tap it, type their name, and they're in. No app to install."}
        </p>

        <Card className="mt-4">
          <p className="break-all rounded-xl bg-paper p-3 font-mono text-sm">{link}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: club.name, text: message, url: link });
                  } catch {}
                } else {
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                }
              }}
            >
              Share
            </Button>
          </div>
        </Card>

        {synced && isHost && (
          <p className="mt-3 px-1 text-xs text-muted">
            Anyone with this link can join.{" "}
            <button
              className="font-medium text-accent disabled:opacity-40"
              disabled={resetting}
              onClick={async () => {
                const supabase = getSupabase();
                if (!supabase || !confirm("Make a new link? The current link will stop working for anyone who hasn't joined yet.")) return;
                setResetting(true);
                try {
                  setCode(await resetInviteCode(supabase, id));
                } catch (e) {
                  setLinkError((e as Error).message);
                }
                setResetting(false);
              }}
            >
              Make a new link
            </button>{" "}
            if it ended up somewhere it shouldn&apos;t.
          </p>
        )}
        {linkError && code && <p className="mt-2 px-1 text-sm text-danger">{linkError}</p>}

        <p className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">What they&apos;ll see</p>
        <Link href={synced && code ? `/join/${id}?invite=${code}` : `/join/${id}`} className="block">
          <Card className="flex items-center gap-3">
            <ClubImage club={club} books={db.books} width={44} />
            <div className="flex-1">
              <p className="font-semibold">{club.name}</p>
              <p className="text-sm text-muted">{club.members.length} members · tap to preview the join page</p>
            </div>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </Card>
        </Link>
      </main>
    </>
  );
}
