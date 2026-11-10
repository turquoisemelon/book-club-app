"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { Button, ButtonLink, Card, Field, TopBar, inputClass } from "@/components/ui";

function SignInForm() {
  const { enabled, user } = useAuth();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "link" ? "That sign-in link didn't work. It may have expired or already been used. Send yourself a new one." : "");

  if (!enabled) {
    return (
      <Card className="mt-6 text-sm text-muted">
        Accounts aren&apos;t switched on yet. Everything still saves on this device only.
      </Card>
    );
  }

  if (user) {
    return (
      <Card className="mt-6 text-center">
        <p className="font-medium">You&apos;re signed in as {user.email}.</p>
        <ButtonLink href="/account" className="mt-4">
          Go to your account
        </ButtonLink>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card className="mt-6 text-center">
        <p className="text-2xl">📬</p>
        <p className="mt-1 font-serif text-xl font-semibold">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to {email}. Open it on the device where you want to use the app.
        </p>
        <button onClick={() => setSent(false)} className="mt-4 text-sm font-medium text-accent">
          Use a different email
        </button>
      </Card>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-4">
      <p className="text-[15px] text-muted">No password needed. We&apos;ll email you a link that signs you in.</p>
      <Field label="Email">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !email.trim()} className="w-full">
        {busy ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}

export default function SignIn() {
  return (
    <>
      <TopBar title="Sign in" back="/" />
      <main className="px-5 pb-10">
        <Suspense>
          <SignInForm />
        </Suspense>
      </main>
    </>
  );
}
