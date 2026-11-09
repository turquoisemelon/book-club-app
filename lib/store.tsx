"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Book, Club, DB, Draft, Rsvp } from "./types";
import { DB_VERSION, makeSampleDB } from "./sample-data";
import { questionsFor, recapFor, reminderFor, scheduleFor, shortlistFor } from "./cohost";
import { uid } from "./format";
import { useAuth } from "./auth";
import { getSupabase } from "./supabase/client";
import { isAccountId, loadRemote, saveChanges, savePrefs } from "./remote";

// Signed out (or before accounts are switched on), everything lives in this
// browser's localStorage, as in the prototype. Signed in, clubs load from and
// save to Supabase, and the screens work the same either way.
const KEY = "book-club-prototype";

type Store = {
  db: DB;
  // True when data is saved to your account rather than only on this device.
  synced: boolean;
  mutate: (fn: (draft: DB) => void) => void;
  reset: () => void;
  reload: () => void;
};

const StoreContext = createContext<Store | null>(null);

// The prototype data saved in this browser, if any.
export function loadLocal(): DB | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {}
  return null;
}

function load(): DB {
  return loadLocal() ?? makeSampleDB();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const userId = auth.enabled ? auth.user?.id : undefined;
  const [db, setDbState] = useState<DB | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reloads, setReloads] = useState(0);
  const dbRef = useRef<DB | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());

  const setDb = useCallback((next: DB | null) => {
    dbRef.current = next;
    setDbState(next);
  }, []);

  const reload = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    if (auth.loading) return;
    const supabase = getSupabase();
    if (!userId || !supabase) {
      // localStorage only exists in the browser, so the first render waits for it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDb(load());
      return;
    }
    let live = true;
    // Wait for pending saves so a reload never shows stale data.
    saving.current
      .then(() => loadRemote(supabase, userId))
      .then((remote) => {
        if (!live) return;
        setLoadError("");
        setDb(remote);
      })
      .catch((e: Error) => live && setLoadError(e.message));
    return () => {
      live = false;
    };
  }, [auth.loading, userId, reloads, setDb]);

  // Pick up changes other members made when you come back to the app.
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, reload]);

  useEffect(() => {
    if (!db) return;
    if (userId) {
      if (db.meId === userId) savePrefs(db);
      return;
    }
    // Never write account data over this device's own clubs (e.g. right after signing out).
    if (isAccountId(db.meId)) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {}
  }, [db, userId]);

  const mutate = useCallback(
    (fn: (draft: DB) => void) => {
      const prev = dbRef.current;
      if (!prev) return;
      const next = structuredClone(prev);
      fn(next);
      setDb(next);
      const supabase = getSupabase();
      if (userId && supabase && prev.meId === userId) {
        saving.current = saving.current
          .then(() => saveChanges(supabase, prev, next))
          .then(() => setSaveError(""))
          .catch((e: Error) => {
            setSaveError(e.message);
            reload();
          });
      }
    },
    [userId, setDb, reload],
  );

  const reset = useCallback(() => {
    if (!userId) setDb(makeSampleDB());
  }, [userId, setDb]);

  if (loadError && !db) {
    return (
      <div className="px-6 pt-24 text-center">
        <p className="font-serif text-xl font-semibold">Couldn&apos;t load your clubs</p>
        <p className="mt-2 text-sm text-muted">{loadError}</p>
        <button onClick={reload} className="mt-4 font-medium text-accent">
          Try again
        </button>
      </div>
    );
  }
  if (!db || (userId ? db.meId !== userId : isAccountId(db.meId))) {
    return <div className="min-h-dvh" />;
  }
  return (
    <StoreContext.Provider value={{ db, synced: Boolean(userId), mutate, reset, reload }}>
      {saveError && (
        <div role="alert" className="sticky top-0 z-30 bg-danger px-4 py-2 text-sm text-white">
          That change didn&apos;t save: {saveError}. Showing the latest saved version.
          <button onClick={() => setSaveError("")} className="ml-2 underline">
            OK
          </button>
        </div>
      )}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

export function useClub(id: string) {
  const { db } = useStore();
  const club = db.clubs.find((c) => c.id === id);
  const book = club?.currentBookId ? db.books.find((b) => b.id === club.currentBookId) : undefined;
  const me = club?.members.find((m) => m.userId === db.meId);
  const isHost = me?.role === "host" && db.viewAs === "host";
  return { club, book, me, isHost, db };
}

function clubIn(db: DB, id: string): Club {
  const club = db.clubs.find((c) => c.id === id);
  if (!club) throw new Error(`No club ${id}`);
  return club;
}

// Reuses a book already in the app with the same title and author, so a cover
// picked once shows everywhere that book appears.
function findOrAddBook(db: DB, rawTitle: string, rawAuthor: string, cover: string | undefined, sections: number) {
  const title = rawTitle.trim();
  const author = rawAuthor.trim();
  const known = db.books.find((b) => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase());
  if (known) {
    if (cover) known.cover = cover;
    return known.id;
  }
  const id = uid("b");
  db.books.push({ id, title, author, cover, sections, sectionLabel: "Chapter" });
  return id;
}

function addDraft(club: Club, draft: Omit<Draft, "id" | "status" | "createdAt">) {
  club.drafts.unshift({ ...draft, id: uid("d"), status: "pending", createdAt: new Date().toISOString() });
}

export const actions = {
  createClub(db: DB, id: string, input: { name: string; description: string; neighbourhood: string; cadence: string; openToMembers: boolean }) {
    db.clubs.unshift({
      id,
      ...input,
      sizeCap: 12,
      members: [{ userId: db.meId, role: "host", progress: 0 }],
      polls: [],
      meetups: [],
      threads: [],
      drafts: [],
      announcements: [],
      joinRequests: [],
    });
    db.viewAs = "host";
  },

  joinClub(db: DB, clubId: string, name: string) {
    const club = clubIn(db, clubId);
    const userId = uid("u");
    db.users.push({ id: userId, name, color: "#7a5c3e" });
    club.members.push({ userId, role: "member", progress: 0 });
  },

  requestToJoin(db: DB, clubId: string) {
    if (!db.requested.includes(clubId)) db.requested.push(clubId);
  },

  setOpen(db: DB, clubId: string, open: boolean) {
    clubIn(db, clubId).openToMembers = open;
  },

  vote(db: DB, clubId: string, pollId: string, bookId: string) {
    const poll = clubIn(db, clubId).polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "open") return;
    for (const o of poll.options) o.votes = o.votes.filter((v) => v !== db.meId);
    poll.options.find((o) => o.bookId === bookId)?.votes.push(db.meId);
  },

  addPollOption(db: DB, clubId: string, pollId: string, book: Book) {
    if (!db.books.some((b) => b.id === book.id)) db.books.push(book);
    const poll = clubIn(db, clubId).polls.find((p) => p.id === pollId);
    if (poll && !poll.options.some((o) => o.bookId === book.id)) poll.options.push({ bookId: book.id, votes: [] });
  },

  openPoll(db: DB, clubId: string, bookIds: string[]) {
    const club = clubIn(db, clubId);
    club.polls.unshift({
      id: uid("p"),
      status: "open",
      createdAt: new Date().toISOString(),
      options: bookIds.map((bookId) => ({ bookId, votes: [] })),
    });
  },

  closePoll(db: DB, clubId: string, pollId: string) {
    const club = clubIn(db, clubId);
    const poll = club.polls.find((p) => p.id === pollId);
    if (!poll) return;
    const winner = [...poll.options].sort((a, b) => b.votes.length - a.votes.length)[0];
    poll.status = "closed";
    poll.winnerBookId = winner?.bookId;
    if (!winner) return;
    club.currentBookId = winner.bookId;
    for (const m of club.members) m.progress = 0;
    const book = db.books.find((b) => b.id === winner.bookId)!;
    const upcoming = club.meetups.filter((m) => new Date(m.date) > new Date());
    const half = Math.ceil(book.sections / 2);
    upcoming.slice(0, 2).forEach((m, i, list) => {
      m.upTo = list.length === 1 || i === 1 ? book.sections : half;
    });
    addDraft(club, { kind: "schedule", title: `Reading plan for ${book.title}`, body: scheduleFor(book, upcoming) });
  },

  addMeetup(db: DB, clubId: string, input: { date: string; place: string; videoLink?: string; upTo: number }) {
    const club = clubIn(db, clubId);
    club.meetups.push({ id: uid("m"), ...input, rsvps: { [db.meId]: "yes" } });
    club.meetups.sort((a, b) => a.date.localeCompare(b.date));
  },

  rsvp(db: DB, clubId: string, meetupId: string, value: Rsvp) {
    const meetup = clubIn(db, clubId).meetups.find((m) => m.id === meetupId);
    if (meetup) meetup.rsvps[db.meId] = value;
  },

  setProgress(db: DB, clubId: string, progress: number) {
    const member = clubIn(db, clubId).members.find((m) => m.userId === db.meId);
    if (member) member.progress = progress;
  },

  addThread(db: DB, clubId: string, id: string, title: string, gate: number) {
    const club = clubIn(db, clubId);
    club.threads.push({ id, bookId: club.currentBookId, title, gate, posts: [] });
  },

  addPost(db: DB, clubId: string, threadId: string, text: string) {
    const thread = clubIn(db, clubId).threads.find((t) => t.id === threadId);
    thread?.posts.push({ id: uid("po"), userId: db.meId, text, at: new Date().toISOString() });
  },

  askCohost(db: DB, clubId: string, kind: Draft["kind"], extra?: { notes?: string; meetupId?: string }) {
    const club = clubIn(db, clubId);
    const book = db.books.find((b) => b.id === club.currentBookId);
    const next = club.meetups.find((m) => new Date(m.date) > new Date());
    if (kind === "questions" && book) {
      const upTo = next?.upTo ?? book.sections;
      addDraft(club, { kind, title: `Discussion questions for ${book.sectionLabel.toLowerCase()}s 1 to ${upTo}`, body: questionsFor(book, upTo), gate: upTo, meetupId: next?.id });
    }
    if (kind === "reminder" && next) {
      addDraft(club, { kind, title: "Meetup reminder", body: reminderFor(club, next, book, db.users), meetupId: next.id });
    }
    if (kind === "shortlist") {
      const { bookIds, body } = shortlistFor(club, db.shelves, db.books);
      addDraft(club, { kind, title: "Next book shortlist", body, bookIds });
    }
    if (kind === "recap" && extra?.notes) {
      addDraft(club, { kind, title: "Meetup recap", body: recapFor(extra.notes, book) });
    }
  },

  approveDraft(db: DB, clubId: string, draftId: string, body: string) {
    const club = clubIn(db, clubId);
    const draft = club.drafts.find((d) => d.id === draftId);
    if (!draft) return;
    draft.status = "approved";
    draft.body = body;
    const at = new Date().toISOString();
    if (draft.kind === "questions") {
      club.threads.push({
        id: uid("t"),
        bookId: club.currentBookId,
        title: draft.title,
        gate: draft.gate ?? 0,
        posts: [{ id: uid("po"), userId: db.meId, text: body, at, aiDrafted: true }],
      });
    } else if (draft.kind === "shortlist" && draft.bookIds?.length) {
      actions.openPoll(db, clubId, draft.bookIds);
      club.announcements.unshift({ id: uid("a"), text: body.replace(/\n\nApproving this[\s\S]*$/, "\n\nThe poll is open, go vote!"), at, aiDrafted: true });
    } else {
      club.announcements.unshift({ id: uid("a"), text: body, at, aiDrafted: true });
    }
  },

  discardDraft(db: DB, clubId: string, draftId: string) {
    const draft = clubIn(db, clubId).drafts.find((d) => d.id === draftId);
    if (draft) draft.status = "discarded";
  },

  addPastRead(db: DB, clubId: string, input: { title: string; author: string; metAt: string; cover?: string }) {
    const club = clubIn(db, clubId);
    const bookId = findOrAddBook(db, input.title, input.author, input.cover, 1);
    club.pastReads = [...(club.pastReads ?? []), { id: uid("pr"), bookId, metAt: input.metAt }].sort((a, b) => b.metAt.localeCompare(a.metAt));
  },

  // Sets what the club is reading without running a poll.
  setCurrentRead(db: DB, clubId: string, input: { title: string; author: string; cover?: string }) {
    const club = clubIn(db, clubId);
    club.currentBookId = findOrAddBook(db, input.title, input.author, input.cover, 20);
    for (const m of club.members) m.progress = 0;
  },

  setBookCover(db: DB, bookId: string, cover?: string) {
    const book = db.books.find((b) => b.id === bookId);
    if (book) book.cover = cover;
  },

  removePastRead(db: DB, clubId: string, pastReadId: string) {
    const club = clubIn(db, clubId);
    club.pastReads = (club.pastReads ?? []).filter((p) => p.id !== pastReadId);
  },

  deleteClub(db: DB, clubId: string) {
    const club = db.clubs.find((c) => c.id === clubId);
    if (!club || !club.members.some((m) => m.userId === db.meId && m.role === "host")) return;
    db.clubs = db.clubs.filter((c) => c.id !== clubId);
    db.requested = db.requested.filter((id) => id !== clubId);
  },

  importShelf(db: DB, entries: { book: Book; shelf: "read" | "to-read" | "currently-reading"; rating?: number }[]) {
    const shelf = db.shelves[db.meId] ?? [];
    for (const e of entries) {
      const known = db.books.find((b) => b.id === e.book.id || (e.book.isbn && b.isbn === e.book.isbn));
      const bookId = known?.id ?? e.book.id;
      if (!known) db.books.push(e.book);
      const existing = shelf.find((s) => s.bookId === bookId);
      if (existing) {
        existing.shelf = e.shelf;
        existing.rating = e.rating;
      } else {
        shelf.push({ bookId, shelf: e.shelf, rating: e.rating });
      }
    }
    db.shelves[db.meId] = shelf;
  },
};
