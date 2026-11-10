"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import { Logo } from "@/components/brand";
import { Landing } from "@/components/landing";
import { ShelfRow } from "@/components/shelf-row";
import { SHELVES, shelfBooks } from "@/lib/shelves";
import { Avatar, AvatarStack, ButtonLink, ClubImage, Card, Pill, SectionTitle, SparkleIcon } from "@/components/ui";

export default function Home() {
  const { db } = useStore();
  const myClubs = db.clubs.filter((c) => c.members.some((m) => m.userId === db.meId));
  const shelf = db.shelves[db.meId] ?? [];
  const me = db.users.find((u) => u.id === db.meId);
  const auth = useAuth();

  // Signed-out visitors get the front door, not someone else's sample clubs.
  if (auth.enabled && !auth.loading && !auth.user) return <Landing />;

  return (
    <main className="px-4 pb-10">
      <header className="flex items-center justify-between pb-2 pt-6">
        <Logo />
        {!auth.enabled ? (
          <span className="text-sm text-muted">Hi, {me?.name}</span>
        ) : auth.loading ? null : auth.user ? (
          <Link href="/account" className="flex items-center gap-2 text-sm text-muted">
            Hi, {auth.profile?.name || me?.name}
            {me && <Avatar user={{ ...me, avatar: auth.profile ? (auth.profile.avatar_url ?? undefined) : me.avatar }} size={28} />}
          </Link>
        ) : (
          <Link href="/sign-in" className="text-sm font-medium text-accent">
            Sign in
          </Link>
        )}
      </header>

      <section className="mt-4 rounded-3xl bg-accent px-5 py-6 text-white">
        <h1 className="font-serif text-[26px] font-semibold leading-tight">Your club, minus the admin.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/85">
          Polls, schedules and reminders in one place. Your AI co-host drafts the busywork, and nothing goes out until you approve it.
        </p>
        <div className="mt-5 flex gap-2">
          <ButtonLink href="/clubs/new" variant="secondary" size="sm" className="border-0">
            Start a club
          </ButtonLink>
          <ButtonLink href="/directory" variant="ghost" size="sm" className="text-white active:bg-white/10">
            Find a club near you
          </ButtonLink>
        </div>
      </section>

      <SectionTitle>Your clubs</SectionTitle>
      <div className="space-y-3">
        {myClubs.map((club) => {
          const book = db.books.find((b) => b.id === club.currentBookId);
          const next = club.meetups.find((m) => new Date(m.date) > new Date());
          const pending = club.drafts.filter((d) => d.status === "pending").length;
          const isHost = club.members.some((m) => m.userId === db.meId && m.role === "host");
          return (
            <Link key={club.id} href={`/clubs/${club.id}`} className="block active:scale-[0.99]">
              <Card className="flex gap-4">
                <ClubImage club={club} books={db.books} width={60} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-semibold leading-tight">{club.name}</h3>
                    {isHost && <Pill tone="accent">Host</Pill>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">{book ? `Reading ${book.title}` : club.pastReads?.length ? "Choosing the next book" : "Choosing a first book"}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <AvatarStack users={club.members.map((m) => db.users.find((u) => u.id === m.userId))} max={4} />
                    {next && <span className="text-xs text-muted">Meets {daysUntil(next.date)}</span>}
                  </div>
                  {isHost && pending > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-ai-soft px-2.5 py-1.5 text-xs font-medium text-ai">
                      <SparkleIcon size={12} />
                      {pending} draft{pending > 1 ? "s" : ""} waiting for your approval
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
        {myClubs.length === 0 && (
          <Card className="text-center text-sm text-muted">
            You&apos;re not in a club yet. Start one, or find one near you.
          </Card>
        )}
      </div>

      <SectionTitle
        action={
          shelf.length > 0 && (
            <Link href="/books" className="text-sm font-medium text-accent">
              See all {shelf.length}
            </Link>
          )
        }
      >
        Your books
      </SectionTitle>
      {SHELVES.map(({ id, label }) => {
        const books = shelfBooks(db, db.meId, id);
        if (!books.length) return null;
        return <ShelfRow key={id} id={id} label={label} books={books} collapsible={id !== "currently-reading"} />;
      })}
      <div className="mt-2" />
      <Link href="/import" className="block">
        <Card className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium">{shelf.length ? "Import from Goodreads again" : "Bring your Goodreads books"}</p>
            <p className="text-sm text-muted">
              {shelf.length ? "Adds new books and updates shelves you've changed." : "Your co-host uses them to suggest what to read next."}
            </p>
          </div>
        </Card>
      </Link>
    </main>
  );
}
