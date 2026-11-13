"use client";

import { use, useState } from "react";
import { actions, useClub, useStore } from "@/lib/store";
import { MeetupCard } from "@/components/meetup-card";
import { MeetupForm } from "@/components/meetup-form";
import { Button, Card, SectionTitle, TopBar } from "@/components/ui";

export default function Meetups({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: startNew } = use(searchParams);
  const { club, book } = useClub(id);
  const { mutate } = useStore();
  const [composing, setComposing] = useState(startNew === "1");
  if (!club) return null;

  const now = new Date();
  const upcoming = club.meetups.filter((m) => new Date(m.date) >= now);
  const past = club.meetups.filter((m) => new Date(m.date) < now);

  return (
    <>
      <TopBar
        title="Meetups"
        back={`/clubs/${id}`}
        right={
          !composing ? (
            <Button size="sm" variant="secondary" onClick={() => setComposing(true)}>
              Schedule
            </Button>
          ) : null
        }
      />
      <main className="px-4">
        {composing && (
          <Card className="mt-4 space-y-3">
            <h2 className="font-serif text-lg font-semibold">New meetup</h2>
            <MeetupForm
              book={book}
              onCancel={() => setComposing(false)}
              onSave={(input) => {
                mutate((d) => actions.addMeetup(d, id, input));
                setComposing(false);
              }}
            />
          </Card>
        )}

        <SectionTitle>Coming up</SectionTitle>
        <div className="space-y-3">
          {upcoming.map((m) => (
            <MeetupCard key={m.id} club={club} meetup={m} book={book} />
          ))}
          {upcoming.length === 0 && <Card className="text-center text-sm text-muted">Nothing scheduled yet.</Card>}
        </div>

        {past.length > 0 && (
          <>
            <SectionTitle>Past</SectionTitle>
            <div className="space-y-3">
              {past.map((m) => (
                <MeetupCard key={m.id} club={club} meetup={m} book={book} compact />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
