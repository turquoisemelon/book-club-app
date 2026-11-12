// A small count of unread messages.
export function UnreadBadge({ count, label }: { count: number; label?: string }) {
  return (
    <span aria-label={label} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
