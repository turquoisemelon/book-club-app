"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { actions, canDeletePost, canDeleteThread, useClub, useStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { ProgressPicker } from "@/components/progress-picker";
import { spanLabel } from "@/lib/progress";
import { readKey } from "@/lib/unread";
import { notifyTalk } from "@/lib/notify";
import { EmailPrompt } from "@/components/email-prompt";
import { AiLabel, Avatar, Button, Card, TopBar, inputClass } from "@/components/ui";

export default function ThreadPage({ params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = use(params);
  const { club, book, me, db } = useClub(id);
  const { mutate, synced } = useStore();
  const router = useRouter();
  const [text, setText] = useState("");
  const thread = club?.threads.find((t) => t.id === threadId);
  const lastAt = thread?.posts.at(-1)?.at ?? "";
  const readAt = db.reads?.[readKey(id, threadId)] ?? "";
  const canRead = Boolean(thread) && (thread?.gate ?? 0) <= (me?.progress ?? 0);

  // Opening a topic (or seeing new messages arrive in it) clears its badge.
  useEffect(() => {
    if (canRead && (!readAt || lastAt > readAt)) mutate((d) => actions.markRead(d, id, threadId));
  }, [canRead, lastAt, readAt, id, threadId, mutate]);

  const [confirmingTopic, setConfirmingTopic] = useState(false);
  const [confirmingPost, setConfirmingPost] = useState<string | null>(null);
  if (!club || !thread) return null;

  const locked = thread.gate > (me?.progress ?? 0);
  const canDeleteTopic = canDeleteThread(club, thread, db.meId);

  function deleteTopic() {
    router.replace(`/clubs/${id}/talk`);
    mutate((d) => actions.deleteThread(d, id, threadId));
  }

  const deleteTopicButton = canDeleteTopic ? (
    <button onClick={() => setConfirmingTopic(true)} className="px-2 text-sm font-medium text-danger">
      Delete
    </button>
  ) : undefined;

  const confirmTopicCard = confirmingTopic && (
    <Card className="space-y-3">
      <h2 className="font-serif text-lg font-semibold text-danger">Delete this topic?</h2>
      <p className="text-sm text-muted">
        This removes the topic and {thread.posts.length === 1 ? "its 1 message" : `all ${thread.posts.length} messages`} for everyone in the club. You can&apos;t undo this.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setConfirmingTopic(false)}>
          Cancel
        </Button>
        <Button variant="danger" className="flex-1" onClick={deleteTopic}>
          Delete topic
        </Button>
      </div>
    </Card>
  );

  if (locked) {
    return (
      <>
        <TopBar title="Spoilers ahead" back={`/clubs/${id}/talk`} right={deleteTopicButton} />
        {confirmTopicCard && <div className="px-4 pt-4">{confirmTopicCard}</div>}
        <main className="px-4 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fbe9e6] text-3xl">🔒</div>
          <h2 className="mt-4 font-serif text-xl font-semibold">
            This topic covers {spanLabel(thread.gate)}
          </h2>
          <p className="mt-2 text-sm text-muted">Mark your progress once you get there and it opens up. No peeking.</p>
          {book && me && (
            <Card className="mt-6 text-left">
              <ProgressPicker clubId={id} progress={me.progress} />
            </Card>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={thread.title} back={`/clubs/${id}/talk`} right={deleteTopicButton} />
      <main className="space-y-3 px-4 pb-40 pt-4">
        {confirmTopicCard}
        {thread.gate > 0 && (
          <p className="px-1 text-xs text-muted">
            Spoilers for {spanLabel(thread.gate)}
          </p>
        )}
        {thread.posts.map((p) => {
          const u = db.users.find((x) => x.id === p.userId);
          const deletable = canDeletePost(club, p, db.meId);
          return (
            <div key={p.id} className="flex gap-3">
              <Link href={`/clubs/${id}/members/${p.userId}`} aria-label={`${u?.name ?? "Member"}'s profile`} className="shrink-0 self-start active:opacity-70">
                <Avatar user={u} size={32} />
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-line bg-card px-3.5 py-2.5">
                <div className="flex items-baseline gap-2">
                  <Link href={`/clubs/${id}/members/${p.userId}`} className="text-sm font-semibold active:opacity-70">
                    {u?.name}
                  </Link>
                  <span className="text-xs text-muted">{timeAgo(p.at)}</span>
                  {deletable && confirmingPost !== p.id && (
                    <button onClick={() => setConfirmingPost(p.id)} className="ml-auto text-xs text-muted" aria-label="Delete message">
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed">{p.text}</p>
                {confirmingPost === p.id && (
                  <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-sm">
                    <span className="flex-1 text-muted">Delete this message for everyone?</span>
                    <button onClick={() => setConfirmingPost(null)} className="font-medium">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        mutate((d) => actions.deletePost(d, id, threadId, p.id));
                        setConfirmingPost(null);
                      }}
                      className="font-medium text-danger"
                    >
                      Delete
                    </button>
                  </div>
                )}
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
        {synced && thread.posts.some((p) => p.userId === db.meId) && <EmailPrompt />}
      </main>
      <form
        className="fixed bottom-[60px] left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-2 border-t border-line bg-paper p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          mutate(
            (d) => actions.addPost(d, id, threadId, text.trim()),
            // Once it's saved, email others in this topic who asked for it.
            () => synced && notifyTalk(id, threadId),
          );
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
