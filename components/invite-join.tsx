"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { joinWithInvite, previewInvite, rememberInvite, type InvitePreview } from "@/lib/invites";
import type { Book } from "@/lib/types";
import { APP_NAME, Logo } from "./brand";
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
      <main className="flex min-h-dvh flex-col px-5 pb-10">
        <header className="pt-6">
          <Logo />
        </header>
        <div className="mt-20 rounded-3xl border border-line bg-card px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-paper text-2xl text-muted" aria-hidden>
            ?
          </div>
          <p className="mt-4 font-serif text-2xl font-semibold">This invite link doesn&apos;t work</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">It may be old, or it got cut off when it was copied. Ask the host to send you the link again.</p>
          <ButtonLink href="/" variant="secondary" className="mt-6 w-full">
            Go to {APP_NAME}
          </ButtonLink>
        </div>
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

  const meta = [`${preview.memberCount} ${preview.memberCount === 1 ? "member" : "members"}`, preview.cadence, preview.neighbourhood].filter(Boolean);

  return (
    <main className="px-5 pb-10">
      <header className="pb-2 pt-6">
        <Logo />
      </header>

      <section className="relative mt-6 overflow-hidden rounded-3xl border border-line bg-card px-5 pb-6 pt-8 text-center shadow-[0_20px_40px_-24px_rgba(31,42,36,0.35)]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-accent-soft to-transparent" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          {preview.hostName ? `${preview.hostName} invited you` : "You're invited"}
        </p>
        <div className="relative mt-5 flex justify-center">
          {book ? <BookCover book={book} width={104} /> : <InitialsTile name={preview.name} />}
        </div>
        <h1 className="relative mt-5 font-serif text-[30px] font-semibold leading-tight">{preview.name}</h1>
        {book && (
          <p className="mt-1 text-sm text-muted">
            Reading <span className="font-medium text-ink">{book.title}</span>
            {book.author ? ` by ${book.author}` : ""}
          </p>
        )}
        {preview.description && <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{preview.description}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {meta.map((m) => (
            <span key={m} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted">
              {m}
            </span>
          ))}
        </div>
      </section>

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
            Accept invite
          </Button>
          <p className="px-4 text-xs leading-relaxed text-muted">No password or app needed. We&apos;ll email you a link. Open it on this device and you&apos;ll come straight back here.</p>
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

function InitialsTile({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => w && !/^(the|a|an|of|and|&)$/i.test(w))
    .slice(0, 2)
    .map((w) => [...w][0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      aria-hidden
      className="relative flex h-[156px] w-[104px] items-center justify-center overflow-hidden rounded-md text-white shadow-[0_8px_20px_-6px_rgba(31,42,36,0.45)]"
      style={{ background: "linear-gradient(160deg, #2f5d50, #1f3f36)" }}
    >
      <span className="absolute inset-y-0 left-0 w-[8%] bg-black/15" />
      <span className="font-serif text-3xl font-semibold tracking-wide">{initials || "?"}</span>
    </div>
  );
}
