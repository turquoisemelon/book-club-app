"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { hasPendingInvite } from "@/lib/invites";
import { getSupabase } from "@/lib/supabase/client";
import { APP_NAME, DrawnCover, Logo } from "@/components/brand";
import { Button, ButtonLink, Field, inputClass } from "@/components/ui";

function SignInForm() {
  const { enabled, user } = useAuth();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fromInvite, setFromInvite] = useState(false);
  const [error, setError] = useState(params.get("error") === "link" ? "That sign-in link didn't work. It may have expired or already been used. Send yourself a new one." : "");

  useEffect(() => {
    // localStorage only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFromInvite(hasPendingInvite());
  }, []);

  if (!enabled) {
    return (
      <Panel title="Accounts are coming soon">
        <p className="text-sm text-muted">Accounts aren&apos;t switched on yet. Everything still saves on this device only.</p>
        <ButtonLink href="/" variant="secondary" className="mt-5 w-full">
          Back home
        </ButtonLink>
      </Panel>
    );
  }

  if (user) {
    return (
      <Panel title="You're signed in">
        <p className="text-sm text-muted">as {user.email}</p>
        <ButtonLink href="/" className="mt-5 w-full">
          Go to your clubs
        </ButtonLink>
      </Panel>
    );
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <Panel
        icon={
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        }
        title="Check your email"
      >
        <p className="text-[15px] leading-relaxed text-muted">
          We sent a sign-in link to <span className="font-medium text-ink">{email.trim()}</span>. Open it on this device{fromInvite ? " and you'll come straight back to your invite" : ""}.
        </p>
        <p className="mt-4 rounded-xl bg-paper px-3 py-2.5 text-xs leading-relaxed text-muted">
          Can&apos;t find it? It can take a minute, and sometimes lands in spam or promotions.
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-center gap-4 text-sm font-medium">
          <button onClick={() => send()} disabled={busy} className="text-accent disabled:opacity-40">
            {busy ? "Sending…" : "Send it again"}
          </button>
          <span className="h-4 w-px bg-line" />
          <button onClick={() => setSent(false)} className="text-accent">
            Use a different email
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={fromInvite ? "Sign in to join your club" : `Welcome to ${APP_NAME}`}>
      <p className="text-[15px] leading-relaxed text-muted">
        {fromInvite ? "Your invite is saved. " : ""}Enter your email and we&apos;ll send you a link. It signs you in, or creates your account if you&apos;re new. No password needed.
      </p>
      <form onSubmit={send} className="mt-5 space-y-4 text-left">
        <Field label="Email">
          <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy || !email.trim()} className="w-full">
          {busy ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
    </Panel>
  );
}

function Panel({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="relative z-10 rounded-3xl border border-line bg-card px-5 pb-6 pt-7 text-center shadow-[0_20px_40px_-24px_rgba(31,42,36,0.35)]">
      {icon && <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</div>}
      <h1 className="font-serif text-[26px] font-semibold leading-tight">{title}</h1>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function SignIn() {
  return (
    <main className="min-h-dvh overflow-hidden px-5 pb-10">
      <header className="flex items-center justify-between pb-2 pt-6">
        <Logo />
        <Link href="/" className="text-sm font-medium text-muted">
          Back
        </Link>
      </header>

      <div aria-hidden className="relative mx-auto mt-8 h-[92px] w-[220px]">
        <DrawnCover title="Circe" author="" color="#5b6abf" width={56} className="absolute left-6 top-4 -rotate-[10deg]" />
        <DrawnCover title="Kindred" author="" color="#2d7d9a" width={62} className="absolute left-1/2 top-0 z-10 -translate-x-1/2" />
        <DrawnCover title="Kairos" author="" color="#a23b72" width={56} className="absolute right-6 top-4 rotate-[10deg]" />
      </div>

      <div className="-mt-1">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>

    </main>
  );
}
