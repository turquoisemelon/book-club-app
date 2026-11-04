"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink, Card, Field, TopBar, inputClass } from "@/components/ui";

function NameForm({ initial, onSave }: { initial: string; onSave: (name: string) => Promise<string | null> }) {
  const [name, setName] = useState(initial);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const error = await onSave(name);
    setBusy(false);
    setStatus(error ?? "Saved.");
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Your name" hint="This is what your clubs will see.">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !name.trim() || name.trim() === initial}>
          Save
        </Button>
        {status && <span className="text-sm text-muted">{status}</span>}
      </div>
    </form>
  );
}

export default function Account() {
  const { enabled, loading, user, profile, saveName, signOut } = useAuth();
  const router = useRouter();

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
              <NameForm key={profile?.name ?? ""} initial={profile?.name ?? ""} onSave={saveName} />
            </Card>
            <Card className="text-sm text-muted">
              Your clubs still live on this device for now. Moving them into your account comes next.
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
