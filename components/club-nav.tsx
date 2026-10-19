"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClub } from "@/lib/store";
import { cx, SparkleIcon } from "./ui";

const icons = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />,
  polls: <path d="M5 20V10M12 20V4M19 20v-7" />,
  talk: <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />,
  meetups: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
};

export function ClubNav({ clubId }: { clubId: string }) {
  const pathname = usePathname();
  const { club, isHost } = useClub(clubId);
  const pending = club?.drafts.filter((d) => d.status === "pending").length ?? 0;
  const base = `/clubs/${clubId}`;
  const tabs = [
    { href: base, label: "Home", icon: icons.home },
    { href: `${base}/polls`, label: "Polls", icon: icons.polls },
    { href: `${base}/talk`, label: "Talk", icon: icons.talk },
    { href: `${base}/meetups`, label: "Meetups", icon: icons.meetups },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="flex">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={cx("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-accent" : "text-muted")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
        {isHost && (
          <Link
            href={`${base}/cohost`}
            className={cx("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium", pathname.startsWith(`${base}/cohost`) ? "text-ai" : "text-muted")}
          >
            <span className="flex h-[22px] items-center">
              <SparkleIcon size={20} />
            </span>
            Co-host
            {pending > 0 && (
              <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ai px-1 text-[10px] text-white">{pending}</span>
            )}
          </Link>
        )}
      </div>
    </nav>
  );
}
