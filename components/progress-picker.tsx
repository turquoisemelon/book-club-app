"use client";

import { actions, useStore } from "@/lib/store";
import type { Book } from "@/lib/types";
import { cx } from "./ui";

export function ProgressPicker({ clubId, book, progress }: { clubId: string; book: Book; progress: number }) {
  const { mutate } = useStore();
  const steps = book.sections <= 12 ? book.sections : 10;
  const values = Array.from({ length: steps + 1 }, (_, i) => Math.round((i / steps) * book.sections));
  const label = progress === 0 ? "Not started" : progress >= book.sections ? "Finished" : `Read up to ${book.sectionLabel.toLowerCase()} ${progress}`;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted">Unlocks discussion as you go</span>
      </div>
      <div className="flex gap-1">
        {values.slice(1).map((v) => (
          <button
            key={v}
            aria-label={`${book.sectionLabel} ${v}`}
            onClick={() => mutate((d) => actions.setProgress(d, clubId, progress === v ? v - (values[1] ?? 1) : v))}
            className={cx("h-8 flex-1 rounded-md text-[11px] font-medium transition", v <= progress ? "bg-accent text-white" : "bg-paper text-muted border border-line")}
          >
            {steps === book.sections ? v : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
