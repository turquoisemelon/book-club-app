"use client";

import Link from "next/link";
import { useState } from "react";
import { coverUrl } from "@/lib/books";
import type { Book, User } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "ai" | "danger";
  size?: "md" | "sm";
};

const buttonStyles = {
  primary: "bg-accent text-white active:bg-[#244a40]",
  secondary: "bg-card text-ink border border-line active:bg-paper",
  ghost: "text-accent active:bg-accent-soft",
  ai: "bg-ai text-white active:bg-[#7d4a0f]",
  danger: "bg-danger text-white active:bg-[#82291e]",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition disabled:opacity-40",
        size === "md" ? "h-12 px-5 text-[15px]" : "h-9 px-4 text-sm",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition",
        size === "md" ? "h-12 px-5 text-[15px]" : "h-9 px-4 text-sm",
        buttonStyles[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-2xl border border-line bg-card p-4", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Avatar({ user, size = 32 }: { user?: User; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-paper"
      style={{ width: size, height: size, background: user?.color ?? "#999", fontSize: size * 0.42 }}
      title={user?.name}
    >
      {user?.name.charAt(0) ?? "?"}
    </span>
  );
}

export function AvatarStack({ users, max = 5 }: { users: (User | undefined)[]; max?: number }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <span key={u?.id ?? i} className={i ? "-ml-2" : ""}>
          <Avatar user={u} size={28} />
        </span>
      ))}
      {users.length > max && <span className="ml-1 text-xs text-muted">+{users.length - max}</span>}
    </div>
  );
}

const coverColors = ["#2f5d50", "#9a5b13", "#5b6abf", "#a23b72", "#2d7d9a", "#6b4f9e"];

export function BookCover({ book, width = 64 }: { book?: Book; width?: number }) {
  // Remember which URL failed, so picking a new cover gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string>();
  const height = Math.round(width * 1.5);
  const url = book ? coverUrl(book, width > 90 ? "L" : "M") : undefined;
  const failed = url !== undefined && url === failedUrl;
  if (!book) {
    return <div className="shrink-0 rounded-md bg-line" style={{ width, height }} />;
  }
  if (!url || failed) {
    const color = coverColors[book.title.length % coverColors.length];
    return (
      <div
        className="flex shrink-0 flex-col justify-between overflow-hidden rounded-md p-1.5 text-left text-white shadow-sm"
        style={{ width, height, background: color }}
      >
        <span className="line-clamp-4 hyphens-auto break-words font-serif font-semibold leading-tight" style={{ fontSize: width < 50 ? 7 : Math.max(9, width / 7.5) }}>
          {book.title}
        </span>
        {width >= 50 && (
          <span className="line-clamp-2 opacity-80" style={{ fontSize: Math.max(7, width / 10) }}>
            {book.author}
          </span>
        )}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Cover of ${book.title}`}
      width={width}
      height={height}
      onError={() => setFailedUrl(url)}
      className="shrink-0 rounded-md bg-line object-cover shadow-sm"
      style={{ width, height }}
    />
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "ai" | "warn"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-paper text-muted border border-line",
    accent: "bg-accent-soft text-accent",
    ai: "bg-ai-soft text-ai",
    warn: "bg-[#fbe9e6] text-danger",
  };
  return <span className={cx("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function TopBar({ title, back, right }: { title?: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line/70 bg-paper/90 px-3 backdrop-blur">
      {back ? (
        <Link href={back} className="flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-line" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="flex-1 truncate font-serif text-lg font-semibold">{title}</h1>
      {right}
    </header>
  );
}

export function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9zM5 15l.7 2 2 .7-2 .7L5 20l-.7-1.6-2-.7 2-.7z" />
    </svg>
  );
}

export function AiLabel() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ai">
      <SparkleIcon size={11} /> drafted with AI
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-line")}
    >
      <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15";
