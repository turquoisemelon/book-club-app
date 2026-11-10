import Link from "next/link";
import { cx } from "./ui";

export const APP_NAME = "Chapter Club";

// The app icon and wordmark, linking home.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Link href="/" className={cx("inline-flex items-center gap-2", className)} aria-label={`${APP_NAME} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={size} height={size} className="rounded-lg" />
      <span className="font-serif text-xl font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}

// A drawn book cover for marketing illustrations; no network needed.
// Position it with `className` on the wrapper (e.g. "absolute left-4 -rotate-6").
export function DrawnCover({ title, author, color, width = 72, className }: { title: string; author: string; color: string; width?: number; className?: string }) {
  return (
    <div aria-hidden className={className}>
      <Cover title={title} author={author} color={color} width={width} />
    </div>
  );
}

function Cover({ title, author, color, width }: { title: string; author: string; color: string; width: number }) {
  return (
    <div
      className="flex shrink-0 flex-col justify-between overflow-hidden rounded-md p-2 text-white shadow-[0_8px_20px_-6px_rgba(31,42,36,0.45)]"
      style={{ position: "relative", width, height: Math.round(width * 1.5), background: `linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 72%, black))` }}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-black/15" />
      <span className="pl-1 font-serif font-semibold leading-tight" style={{ fontSize: Math.max(10, width / 7) }}>
        {title}
      </span>
      <span className="pl-1 opacity-80" style={{ fontSize: Math.max(8, width / 11) }}>
        {author}
      </span>
    </div>
  );
}
