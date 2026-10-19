"use client";

import { use, useState } from "react";
import { actions, useClub, useStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { ProgressPicker } from "@/components/progress-picker";
import { AiLabel, Avatar, Button, Card, TopBar, inputClass } from "@/components/ui";

export default function ThreadPage({ params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = use(params);
  const { club, book, me, db } = useClub(id);
  const { mutate } = useStore();
  const [text, setText] = useState("");
  const thread = club?.threads.find((t) => t.id === threadId);
  if (!club || !thread) return null;

  const label = book?.sectionLabel.toLowerCase() ?? "chapter";
  const locked = thread.gate > (me?.progress ?? 0);

  if (locked) {
    return (
      <>
        <TopBar title="Spoilers ahead" back={`/clubs/${id}/talk`} />
        <main className="px-4 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fbe9e6] text-3xl">🔒</div>
          <h2 className="mt-4 font-serif text-xl font-semibold">
            This topic covers up to {label} {thread.gate}
          </h2>
          <p className="mt-2 text-sm text-muted">Mark your progress once you get there and it opens up. No peeking.</p>
          {book && me && (
            <Card className="mt-6 text-left">
              <ProgressPicker clubId={id} book={book} progress={me.progress} />
            </Card>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={thread.title} back={`/clubs/${id}/talk`} />
      <main className="space-y-3 px-4 pb-40 pt-4">
        {thread.gate > 0 && (
          <p className="px-1 text-xs text-muted">
            Spoilers up to {label} {thread.gate}
          </p>
        )}
        {thread.posts.map((p) => {
          const u = db.users.find((x) => x.id === p.userId);
          return (
            <div key={p.id} className="flex gap-3">
              <Avatar user={u} size={32} />
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-line bg-card px-3.5 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{u?.name}</span>
                  <span className="text-xs text-muted">{timeAgo(p.at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed">{p.text}</p>
                {p.aiDrafted && (
                  <div className="mt-1.5">
                    <AiLabel />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {thread.posts.length === 0 && <p className="py-8 text-center text-sm text-muted">Be the first to say something.</p>}
      </main>
      <form
        className="fixed bottom-[60px] left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-2 border-t border-line bg-paper p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          mutate((d) => actions.addPost(d, id, threadId, text.trim()));
          setText("");
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" className={inputClass} />
        <Button type="submit" disabled={!text.trim()}>
          Send
        </Button>
      </form>
    </>
  );
}
