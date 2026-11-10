"use client";

import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import type { Club } from "@/lib/types";
import { Button, inputClass } from "./ui";

const MAX_NAME = 60;
const MAX_DESCRIPTION = 500;

// The line under a club's name. Hosts can tap Edit to change the club's name
// and description in place; members just read it. The database also refuses
// these changes from anyone but the host.
export function ClubDetails({ club, isHost }: { club: Club; isHost: boolean }) {
  const { mutate } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description);

  if (editing) {
    const newName = name.trim();
    const newDescription = description.trim();
    const save = () => {
      if (newName !== club.name || newDescription !== club.description) {
        mutate((d) => actions.setDetails(d, club.id, { name: newName, description: newDescription }));
      }
      setEditing(false);
    };
    return (
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1.5 block px-1 text-sm font-medium">Club name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
            autoFocus
            placeholder="Sunday Pages"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between px-1 text-sm font-medium">
            Description
            <span className="text-xs font-normal text-muted">
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
            rows={3}
            placeholder="What your club reads and how it runs."
            className={inputClass}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={!newName || !newDescription}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
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
              setName(club.name);
              setDescription(club.description);
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
