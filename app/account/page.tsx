"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink, Card, Field, TopBar, inputClass } from "@/components/ui";

function NameForm({ initial, onSave, onSaved }: { initial: string; onSave: (name: string) => Promise<string | null>; onSaved: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const err = await onSave(name);
    setBusy(false);
    if (err) setError(`Couldn't save your name. ${err}`);
    else onSaved(name.trim());
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Your name" hint="This is what your clubs will see.">
        <input
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          className={inputClass}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !name.trim() || name.trim() === initial}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <span aria-live="polite" className="text-sm text-danger">
          {error}
        </span>
      </div>
    </form>
  );
}

// Shown after someone sets their name for the first time, then sends them home.
function WelcomeDone({ name }: { name: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div role="status" aria-live="polite">
      <Card className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent">✓</div>
        <p className="mt-3 font-serif text-xl font-semibold">Thanks, {name}! You&apos;re all set.</p>
        <p className="mt-1 text-sm text-muted">Taking you home…</p>
        <ButtonLink href="/" variant="secondary" size="sm" className="mt-4">
          Go now
        </ButtonLink>
      </Card>
    </div>
  );
}

// Small confirmation for later name changes; stays on the page and fades out.
function SavedNote({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-accent">
      ✓ Saved. Your clubs will see the new name.
    </p>
  );
}

export default function Account() {
  const { enabled, loading, user, profile, saveName, signOut } = useAuth();
  const router = useRouter();
  // "welcome": first name just set, show a thank-you and head home. "updated": a later change.
  const [saved, setSaved] = useState<{
    kind: "welcome" | "updated";
    name: string;
  } | null>(null);
  const clearSaved = useCallback(() => setSaved(null), []);

  if (saved?.kind === "welcome") {
    return (
      <>
        <TopBar title="Your account" back="/" />
        <main className="px-5 pb-10 pt-6">
          <WelcomeDone name={saved.name} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Your account" back="/" />
      <main className="space-y-4 px-5 pb-10 pt-6">
        {!enabled ? (
          <Card className="text-sm text-muted">Accounts aren&apos;t switched on yet. Everything still saves on this device only.</Card>
        ) : loading ? null : !user ? (
          <Card className="text-center">
            <p className="font-medium">You&apos;re not signed in.</p>
            <ButtonLink href="/sign-in" className="mt-4">
              Sign in
            </ButtonLink>
          </Card>
        ) : (
          <>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Signed in as</p>
              <p className="mt-1 font-medium">{user.email}</p>
            </Card>
            <Card>
              <NameForm
                key={profile?.name ?? ""}
                initial={profile?.name ?? ""}
                onSave={saveName}
                onSaved={(name) =>
                  setSaved({
                    kind: profile?.name ? "updated" : "welcome",
                    name,
                  })
                }
              />
              {saved?.kind === "updated" && <SavedNote onDone={clearSaved} />}
            </Card>
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Sign out
            </Button>
          </>
        )}
      </main>
    </>
  );
}
