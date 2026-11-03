"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useStore } from "@/lib/store";
import type { Club } from "@/lib/types";
import { Button, Card, Field, inputClass } from "./ui";

// Host-only. Deleting asks the host to type the club's name first, because it
// removes the club's meetups, polls and talk for everyone and can't be undone.
export function DeleteClub({ club }: { club: Club }) {
  const { mutate } = useStore();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === club.name.trim().toLowerCase();

  if (!confirming) {
    return (
      <Card className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium">Delete this club</p>
          <p className="text-sm text-muted">Removes the club, its meetups, polls and talk for every member.</p>
        </div>
        <Button size="sm" variant="secondary" className="text-danger" onClick={() => setConfirming(true)}>
          Delete
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-3 space-y-3">
      <h2 className="font-serif text-lg font-semibold text-danger">Delete {club.name}?</h2>
      <p className="text-sm text-muted">
        This removes the club for all {club.members.length} {club.members.length === 1 ? "member" : "members"}, along with its meetups, polls, talk threads and past reads. You can&apos;t undo this.
      </p>
      <Field label={`Type ${club.name} to confirm`}>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} autoComplete="off" aria-label="Club name" />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setConfirming(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          disabled={!matches}
          onClick={() => {
            router.replace("/");
            mutate((d) => actions.deleteClub(d, club.id));
          }}
        >
          Delete club
        </Button>
      </div>
    </Card>
  );
}
