"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import { Button, Card, Field, Toggle, TopBar, inputClass } from "@/components/ui";

const cadences = ["Every 3 weeks", "Monthly", "Every 6 weeks", "Whenever we can"];

export default function NewClub() {
  const { mutate } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [cadence, setCadence] = useState(cadences[1]);
  const [openToMembers, setOpen] = useState(false);

  return (
    <>
      <TopBar title="Start a club" back="/" />
      <main className="space-y-4 px-4 pb-10 pt-4">
        <Field label="Club name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunday Pages" className={inputClass} />
        </Field>
        <Field label="What's it about?" hint="A line or two. Genres, vibe, how serious you are about finishing.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Literary fiction, good snacks, no pressure to finish." className={inputClass} />
        </Field>
        <Field label="Where do you usually meet?" hint="A neighbourhood is enough. Never shown as an exact address.">
          <input value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} placeholder="Downtown, or Online" className={inputClass} />
        </Field>
        <Field label="How often?">
          <div className="flex flex-wrap gap-2">
            {cadences.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={`rounded-full border px-3.5 py-2 text-sm ${cadence === c ? "border-accent bg-accent text-white" : "border-line bg-card"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Card className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-medium">Open to new members</p>
            <p className="text-sm text-muted">List the club in the local directory. You approve everyone who asks to join.</p>
          </div>
          <Toggle checked={openToMembers} onChange={setOpen} label="Open to new members" />
        </Card>
        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            const id = uid("c");
            mutate((d) => actions.createClub(d, id, { name: name.trim(), description: description.trim() || "A new book club.", neighbourhood: neighbourhood.trim() || "Online", cadence, openToMembers }));
            router.push(`/clubs/${id}/invite`);
          }}
        >
          Create club
        </Button>
      </main>
    </>
  );
}
