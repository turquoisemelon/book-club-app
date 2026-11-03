"use client";

import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { CoverPicker } from "./cover-picker";
import { Button, Card, Field, inputClass } from "./ui";

// Lets a host say what the club is reading right now, without running a poll.
export function CurrentReadForm({ clubId, onDone }: { clubId: string; onDone: () => void }) {
  const { mutate } = useStore();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [cover, setCover] = useState<string>();

  return (
    <Card className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">What are you reading now?</h2>
      <Field label="Title">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Author (optional)">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} />
      </Field>
      <CoverPicker title={title} author={author} value={cover} onChange={setCover} />
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!title.trim()}
          onClick={() => {
            mutate((d) => actions.setCurrentRead(d, clubId, { title, author, cover }));
            onDone();
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}
