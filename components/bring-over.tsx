"use client";

import { useEffect, useState } from "react";
import { loadLocal, useStore } from "@/lib/store";
import { bringOverClubs, clubsToBringOver } from "@/lib/remote";
import { getSupabase } from "@/lib/supabase/client";
import type { DB } from "@/lib/types";
import { Button, Card } from "./ui";

const doneKey = (userId: string) => `book-club-brought-${userId}`;
const hiddenKey = (userId: string) => `book-club-bring-over-hidden-${userId}`;

function readDone(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(doneKey(userId)) ?? "[]");
  } catch {
    return [];
  }
}

// Offers to copy the clubs you host on this device (from before you had an
// account) into your account. The copies on this device are left untouched.
// On the home screen it can be hidden with "Not now"; the account page always
// shows it while there's something left to copy.
export function BringOverClubs({ hideable = false }: { hideable?: boolean }) {
  const { db, synced, reload } = useStore();
  const [local, setLocal] = useState<DB | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!synced) return;
    const saved = loadLocal();
    const already = readDone(db.meId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(saved);
    setDone(already);
    try {
      setHidden(hideable && localStorage.getItem(hiddenKey(db.meId)) === "1");
    } catch {}
    setPicked(saved ? clubsToBringOver(saved).map((c) => c.id).filter((id) => !already.includes(id)) : []);
  }, [synced, db.meId, hideable]);

  if (!synced || !local || hidden) return null;
  const candidates = clubsToBringOver(local).filter((c) => !done.includes(c.id));
  if (!candidates.length) return null;

  async function bring() {
    const supabase = getSupabase();
    if (!supabase || !local) return;
    setBusy(true);
    setError("");
    try {
      await bringOverClubs(supabase, db.meId, local, picked);
      const next = [...done, ...picked];
      try {
        localStorage.setItem(doneKey(db.meId), JSON.stringify(next));
      } catch {}
      setDone(next);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  function hide() {
    try {
      localStorage.setItem(hiddenKey(db.meId), "1");
    } catch {}
    setHidden(true);
  }

  return (
    <Card className="mt-4 border-accent/40">
      <p className="font-serif text-lg font-semibold">Bring your clubs into your account</p>
      <p className="mt-1 text-sm text-muted">
        These clubs are saved only on this device. Copy them into your account so they&apos;re safe and you can invite people. You&apos;ll be the host; other members appear by name until they join with their own accounts.
      </p>
      <div className="mt-3 space-y-2">
        {candidates.map((c) => (
          <label key={c.id} className="flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--color-accent)]"
              checked={picked.includes(c.id)}
              onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((id) => id !== c.id)))}
            />
            {c.name}
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {hideable && <p className="mt-2 text-xs text-muted">You can always do this later from your account page.</p>}
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={bring} disabled={busy || !picked.length}>
          {busy ? "Copying…" : `Copy ${picked.length === 1 ? "1 club" : `${picked.length} clubs`}`}
        </Button>
        {hideable && (
          <button onClick={hide} className="text-sm text-muted">
            Not now
          </button>
        )}
      </div>
    </Card>
  );
}
