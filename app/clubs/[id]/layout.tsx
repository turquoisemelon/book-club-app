"use client";

import { use } from "react";
import Link from "next/link";
import { ClubNav } from "@/components/club-nav";
import { useClub, useStore } from "@/lib/store";

export default function ClubLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club } = useClub(id);
  const { synced } = useStore();

  if (!club) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4 text-muted">
          {synced
            ? "This club doesn't exist, or it's private and you're not a member."
            : "This club doesn't exist on this phone. Clubs in the prototype live only in the browser you made them in."}
        </p>
        <Link href="/" className="font-medium text-accent">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {children}
      <ClubNav clubId={id} />
    </div>
  );
}
