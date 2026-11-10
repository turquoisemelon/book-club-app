"use client";

import { use, useState } from "react";
import Link from "next/link";
import { actions, useClub } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { MeetupCard } from "@/components/meetup-card";
import { ProgressPicker } from "@/components/progress-picker";
import { PastReads } from "@/components/past-reads";
import { DeleteClub } from "@/components/delete-club";
import { ClubDescription } from "@/components/club-description";
import { CoverSheet } from "@/components/cover-picker";
import { CurrentReadForm } from "@/components/current-read-form";
import { AiLabel, Avatar, BookCover, Button, ButtonLink, Card, SectionTitle, SparkleIcon, Toggle, TopBar } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ClubHome({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { club, book, me, isHost, db } = useClub(id);
  const { mutate } = useStore();
  const [settingBook, setSettingBook] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  if (!club) return null;

  const next = club.meetups.find((m) => new Date(m.date) > new Date());
  const pending = club.drafts.filter((d) => d.status === "pending").length;
  const openPoll = club.polls.find((p) => p.status === "open");

  return (
    <>
      <TopBar
        title={club.name}
        back="/"
        right={
          isHost ? (
            <ButtonLink href={`/clubs/${id}/invite`} size="sm" variant="secondary">
              Invite
            </ButtonLink>
          ) : null
        }
      />
      <main className="px-4">
        <ClubDescription club={club} isHost={isHost} />

        {isHost && pending > 0 && (
          <Link href={`/clubs/${id}/cohost`} className="mt-4 flex items-center gap-3 rounded-2xl bg-ai-soft p-4 text-ai active:opacity-80">
            <SparkleIcon size={22} />
            <div className="flex-1">
              <p className="font-semibold">Your co-host drafted {pending === 1 ? "something" : `${pending} things`}</p>
              <p className="text-sm opacity-80">Review before your members see it</p>
            </div>
            <span aria-hidden>›</span>
          </Link>
        )}

        {openPoll && (
          <Link href={`/clubs/${id}/polls`} className="mt-4 flex items-center gap-3 rounded-2xl bg-accent-soft p-4 text-accent active:opacity-80">
            <div className="flex-1">
              <p className="font-semibold">Vote for the next book</p>
              <p className="text-sm opacity-80">{openPoll.options.length} choices · {openPoll.options.reduce((n, o) => n + o.votes.length, 0)} votes so far</p>
            </div>
            <span aria-hidden>›</span>
          </Link>
        )}

        <SectionTitle>Now reading</SectionTitle>
        {book ? (
          <Card>
            <div className="flex gap-4">
              {isHost ? (
                <button onClick={() => setEditingCover(true)} aria-label={`Change cover of ${book.title}`} className="shrink-0 active:opacity-70">
                  <BookCover book={book} width={84} />
                </button>
              ) : (
                <BookCover book={book} width={84} />
              )}
              <div className="min-w-0">
                <h3 className="font-serif text-xl font-semibold leading-tight">{book.title}</h3>
                <p className="text-sm text-muted">{book.author}</p>
                {book.blurb && <p className="mt-2 text-sm leading-snug">{book.blurb}</p>}
                {isHost && (
                  <button onClick={() => setEditingCover(true)} className="mt-2 text-sm font-medium text-accent">
                    Change cover
                  </button>
                )}
              </div>
            </div>
            {me && (
              <div className="mt-4 border-t border-line pt-4">
                <ProgressPicker clubId={id} book={book} progress={me.progress} />
              </div>
            )}
          </Card>
        ) : settingBook ? (
          <CurrentReadForm clubId={id} onDone={() => setSettingBook(false)} />
        ) : (
          <Card className="text-center">
            <p className="text-sm text-muted">No book yet.</p>
            {isHost && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => setSettingBook(true)}>
                  Add what we&apos;re reading
                </Button>
                <ButtonLink href={`/clubs/${id}/polls`} size="sm" variant="secondary">
                  Run a poll
                </ButtonLink>
              </div>
            )}
          </Card>
        )}
        {book && editingCover && (
          <CoverSheet
            book={book}
            onClose={() => setEditingCover(false)}
            onSave={(cover) => {
              mutate((d) => actions.setBookCover(d, book.id, cover));
              setEditingCover(false);
            }}
          />
        )}

        <SectionTitle action={<Link href={`/clubs/${id}/meetups`} className="text-sm font-medium text-accent">All</Link>}>Next meetup</SectionTitle>
        {next ? (
          <MeetupCard club={club} meetup={next} book={book} />
        ) : (
          <Card className="text-center">
            <p className="text-sm text-muted">No meetup scheduled.</p>
            {isHost && (
              <ButtonLink href={`/clubs/${id}/meetups?new=1`} size="sm" className="mt-3">
                Schedule one
              </ButtonLink>
            )}
          </Card>
        )}

        {club.announcements.length > 0 && (
          <>
            <SectionTitle>From the host</SectionTitle>
            <div className="space-y-3">
              {club.announcements.slice(0, 4).map((a) => {
                const host = db.users.find((u) => u.id === club.members.find((m) => m.role === "host")?.userId);
                return (
                  <Card key={a.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar user={host} size={24} />
                      <span className="text-sm font-medium">{host?.name}</span>
                      <span className="text-xs text-muted">{timeAgo(a.at)}</span>
                    </div>
                    <p className="whitespace-pre-line text-[15px] leading-relaxed">{a.text}</p>
                    {a.aiDrafted && (
                      <div className="mt-2">
                        <AiLabel />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <PastReads club={club} isHost={isHost} />

        <SectionTitle>Members · {club.members.length}</SectionTitle>
        <Card>
          <div className="flex flex-wrap gap-3">
            {club.members.map((m) => {
              const u = db.users.find((x) => x.id === m.userId);
              return (
                <div key={m.userId} className="flex w-14 flex-col items-center gap-1">
                  <Avatar user={u} size={40} />
                  <span className="w-full truncate text-center text-xs">{u?.name}</span>
                  {m.role === "host" && <span className="text-[10px] text-accent">host</span>}
                </div>
              );
            })}
          </div>
        </Card>

        {isHost && (
          <>
            <SectionTitle>Club settings</SectionTitle>
            <Card className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">Open to new members</p>
                <p className="text-sm text-muted">Shows your club in the local directory so readers nearby can ask to join.</p>
              </div>
              <Toggle checked={club.openToMembers} onChange={(v) => mutate((d) => actions.setOpen(d, id, v))} label="Open to new members" />
            </Card>
            <DeleteClub club={club} />
          </>
        )}
      </main>
    </>
  );
}
