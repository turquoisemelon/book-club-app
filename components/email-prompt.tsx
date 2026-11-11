"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "./ui";

// Asks once, after you've written in a topic, whether you'd like an email when
// people reply. Emails stay off unless you say yes. Shows only for signed-in
// people who haven't answered yet (and once 0008_talk_notifications.sql has run).
export function EmailPrompt() {
  const { profile, saveEmailTalk } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answered, setAnswered] = useState<boolean | null>(null);

  if (answered === true) {
    return (
      <p role="status" className="px-1 text-center text-xs text-muted">
        ✓ We&apos;ll email you when someone replies. Change this on your account page.
      </p>
    );
  }
  if (answered === false || profile?.email_talk !== null) return null;

  async function answer(on: boolean) {
    setBusy(true);
    setError("");
    const err = await saveEmailTalk(on);
    setBusy(false);
    if (err) setError(err);
    else setAnswered(on);
  }

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-medium">Get an email when someone replies?</p>
        <p className="mt-0.5 text-sm text-muted">For topics you&apos;ve written in. One email per topic until you open it again, and you can turn it off any time.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => answer(false)}>
          No thanks
        </Button>
        <Button size="sm" className="flex-1" disabled={busy} onClick={() => answer(true)}>
          Yes, email me
        </Button>
      </div>
      {error && (
        <p aria-live="polite" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
