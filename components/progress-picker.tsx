"use client";

import { actions, useStore } from "@/lib/store";
import { STEPS, progressLabel, snapDown } from "@/lib/progress";
import { cx } from "./ui";

// Four blocks, one per quarter of the book. Tapping the block you're on steps
// back one, so a mistap is easy to undo.
export function ProgressPicker({ clubId, progress }: { clubId: string; progress: number }) {
  const { mutate } = useStore();
  const current = snapDown(progress);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{progressLabel(current)}</span>
        <span className="text-xs text-muted">Unlocks discussion as you go</span>
      </div>
      <div className="flex gap-1">
        {STEPS.map((v) => (
          <button
            key={v}
            aria-label={`Read ${v}%`}
            aria-pressed={v <= current}
            onClick={() => mutate((d) => actions.setProgress(d, clubId, current === v ? v - 25 : v))}
            className={cx("h-9 flex-1 rounded-md text-xs font-medium transition", v <= current ? "bg-accent text-white" : "bg-paper text-muted border border-line")}
          >
            {v}%
          </button>
        ))}
      </div>
    </div>
  );
}
