// Unread messages in Talk topics you're in: topics you started or wrote in.
import type { Club, DB, Thread } from "./types";

export const readKey = (clubId: string, threadId: string) => `${clubId}:${threadId}`;

export function isInThread(thread: Thread, userId: string) {
  return thread.createdBy === userId || thread.posts.some((p) => p.userId === userId);
}

// Messages from others since you last opened the topic (or last wrote in it,
// whichever is later). Zero for topics you're not in.
export function unreadIn(db: DB, club: Club, thread: Thread): number {
  const me = db.meId;
  if (!isInThread(thread, me)) return 0;
  let since = db.reads?.[readKey(club.id, thread.id)] ?? "";
  for (const p of thread.posts) if (p.userId === me && p.at > since) since = p.at;
  return thread.posts.filter((p) => p.userId !== me && p.at > since).length;
}

// Topics shown in Talk: the current book's, plus general ones. Locked topics
// don't count, since you can't open them yet.
export function unreadInClub(db: DB, club: Club): number {
  const progress = club.members.find((m) => m.userId === db.meId)?.progress ?? 0;
  return club.threads
    .filter((t) => (!t.bookId || t.bookId === club.currentBookId) && t.gate <= progress)
    .reduce((n, t) => n + unreadIn(db, club, t), 0);
}
