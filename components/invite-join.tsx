"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { joinWithInvite, previewInvite, rememberInvite, type InvitePreview } from "@/lib/invites";
import type { Book } from "@/lib/types";
import { BookCover, Button, ButtonLink, Card, Field, inputClass } from "./ui";

// The join page once accounts are switched on: preview the club from the
// invite code, sign in if needed, pick a name, join.
export function InviteJoin({ clubId, code }: { clubId: string; code: string }) {
  const { user, loading, profile, saveName } = useAuth();
  const { reload } = useStore();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || loading) return;
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return;
    }
    let live = true;
    previewInvite(supabase, clubId, code)
      .then((p) => live && setPreview(p))
      .catch(() => live && setPreview(null));
    return () => {
      live = false;
    };
  }, [clubId, code, loading, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile?.name) setName((n) => n || profile.name);
  }, [profile?.name]);

  if (preview === undefined) return <div className="min-h-dvh" />;
  if (preview === null) {
    return (
      <main className="px-6 pt-24 text-center">
        <p className="font-serif text-xl font-semibold">This invite link doesn&apos;t work</p>
        <p className="mt-2 text-sm text-muted">It may be old or copied incompletely. Ask the host to send you the link again.</p>
        <Link href="/" className="mt-4 inline-block font-medium text-accent">
          Go home
        </Link>
      </main>
    );
  }

  const full = preview.memberCount >= preview.sizeCap;
  const book = preview.book
    ? ({ ...preview.book, isbn: preview.book.isbn ?? undefined, coverId: preview.book.coverId ?? undefined, cover: preview.book.cover ?? undefined } as Book)
    : undefined;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      if (name.trim() && name.trim() !== profile?.name) {
        const nameError = await saveName(name.trim());
        if (nameError) throw new Error(nameError);
      }
      await joinWithInvite(supabase, clubId, code);
      reload();
      router.push(`/clubs/${clubId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-10 pt-10">
      <p className="text-center text-sm text-muted">{preview.hostName ? `${preview.hostName} invited you to` : "You're invited to"}</p>
      <h1 className="mt-1 text-center font-serif text-3xl font-semibold">{preview.name}</h1>
      {preview.description && <p className="mt-2 text-center text-[15px] text-muted">{preview.description}</p>}
      <p className="mt-2 text-center text-sm text-muted">
        {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"}
        {preview.cadence ? ` · ${preview.cadence}` : ""}
        {preview.neighbourhood ? ` · ${preview.neighbourhood}` : ""}
      </p>

      {book && (
        <Card className="mt-6 flex gap-4">
          <BookCover book={book} width={64} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reading now</p>
            <p className="mt-1 font-serif text-lg font-semibold leading-tight">{book.title}</p>
            <p className="text-sm text-muted">{book.author}</p>
          </div>
        </Card>
      )}

      {preview.isMember ? (
        <Card className="mt-6 text-center">
          <p className="font-medium">You&apos;re already in this club.</p>
          <ButtonLink href={`/clubs/${clubId}`} className="mt-4">
            Go to the club
          </ButtonLink>
        </Card>
      ) : full ? (
        <Card className="mt-6 text-center text-sm text-muted">This club is full right now. Ask the host if a spot opens up.</Card>
      ) : !user ? (
        <div className="mt-6 space-y-3 text-center">
          <Button
            className="w-full"
            onClick={() => {
              rememberInvite(`/join/${clubId}?invite=${code}`);
              router.push("/sign-in");
            }}
          >
            Sign in to join
          </Button>
          <p className="text-xs text-muted">No password or app needed. We&apos;ll email you a link. Open it on this device and you&apos;ll come straight back here.</p>
        </div>
      ) : (
        <form onSubmit={join} className="mt-6 space-y-3">
          <Field label="Your name" hint="This is what the club will see.">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" autoComplete="given-name" className={inputClass} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
            {busy ? "Joining…" : "Join the club"}
          </Button>
        </form>
      )}
    </main>
  );
}
