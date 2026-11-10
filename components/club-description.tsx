"use client";

import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import type { Club } from "@/lib/types";
import { Button, inputClass } from "./ui";

const MAX = 500;

// The line under a club's name. Hosts can tap Edit to rewrite it in place;
// members just read it. The database also refuses description changes from
// anyone but the host.
export function ClubDescription({ club, isHost }: { club: Club; isHost: boolean }) {
  const { mutate } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(club.description);

  if (editing) {
    const trimmed = text.trim();
    const save = () => {
      if (trimmed !== club.description) mutate((d) => actions.setDescription(d, club.id, trimmed));
      setEditing(false);
    };
    return (
      <div className="mt-3 space-y-2">
        <label className="block">
          <span className="mb-1.5 block px-1 text-sm font-medium">Club description</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            rows={3}
            autoFocus
            placeholder="What your club reads and how it runs."
            className={inputClass}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={!trimmed}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <span className="ml-auto text-xs text-muted">
            {text.length}/{MAX}
          </span>
        </div>
      </div>
    );
  }

  return (
    <p className="mt-3 px-1 text-sm text-muted">
      {club.description} · {club.cadence}
      {isHost && (
        <>
          {" "}
          <button
            onClick={() => {
              setText(club.description);
              setEditing(true);
            }}
            className="font-medium text-accent"
          >
            Edit
          </button>
        </>
      )}
    </p>
  );
}
