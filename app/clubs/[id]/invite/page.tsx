"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useClub } from "@/lib/store";
import { BookCover, Button, Card, TopBar } from "@/components/ui";

export default function Invite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, book } = useClub(id);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);
  if (!club) return null;

  const link = `${origin}/join/${id}`;
  const message = `Join ${club.name} on Book Club${book ? `, we're reading ${book.title}` : ""}: ${link}`;

  return (
    <>
      <TopBar title="Invite people" back={`/clubs/${id}`} />
      <main className="px-4 pt-4">
        <p className="px-1 text-[15px] leading-relaxed">Send this link to anyone you want in the club. They tap it, type their name, and they&apos;re in. No app to install.</p>

        <Card className="mt-4">
          <p className="break-all rounded-xl bg-paper p-3 font-mono text-sm">{link}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: club.name, text: message, url: link });
                  } catch {}
                } else {
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                }
              }}
            >
              Share
            </Button>
          </div>
        </Card>

        <p className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">What they&apos;ll see</p>
        <Link href={`/join/${id}`} className="block">
          <Card className="flex items-center gap-3">
            <BookCover book={book} width={44} />
            <div className="flex-1">
              <p className="font-semibold">{club.name}</p>
              <p className="text-sm text-muted">{club.members.length} members · tap to preview the join page</p>
            </div>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </Card>
        </Link>
      </main>
    </>
  );
}
