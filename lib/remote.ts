// Loads and saves the app's data in Supabase for signed-in people.
//
// The screens keep working on the same in-memory DB shape as the local
// prototype. After each change, `saveChanges` compares the DB before and after
// and writes only what changed: books, club rows, member rows, and your shelves.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book, Club, DB, Membership, ShelfEntry, User } from "./types";
import { DB_VERSION } from "./sample-data";
import { validRating } from "./books";

// Parts of a club stored together as JSON in clubs.content for now.
type ClubContent = Pick<Club, "polls" | "meetups" | "threads" | "drafts" | "announcements" | "joinRequests" | "pastReads">;

type BookRow = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_id: number | null;
  cover: string | null;
  pages: number | null;
  sections: number;
  section_label: string;
  blurb: string | null;
};

type ClubRow = {
  id: string;
  name: string;
  description: string;
  neighbourhood: string;
  cadence: string;
  open_to_members: boolean;
  size_cap: number;
  current_book_id: string | null;
  content: Partial<ClubContent>;
};

type MemberRow = { club_id: string; user_id: string; role: "host" | "member"; progress: number };

type ShelfRow = {
  user_id: string;
  book_id: string;
  shelf: ShelfEntry["shelf"];
  rating: number | null;
  added_at: string;
  read_at: string | null;
};

// Settings people keep per device: directory join requests. (Shelves used to
// live here too; `legacyShelf` picks up any saved before they moved.)
type LocalPrefs = Pick<DB, "requested"> & { shelves?: DB["shelves"] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isAccountId = (id: string) => UUID.test(id);

const PALETTE = ["#2f5d50", "#b5651d", "#5b6abf", "#a23b72", "#3c7a3a", "#8a6d1f", "#2d7d9a", "#9b4d3c", "#6b4f9e"];
export function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function prefsKey(userId: string) {
  return `book-club-prefs-${userId}`;
}

function loadPrefs(userId: string): LocalPrefs {
  try {
    const raw = localStorage.getItem(prefsKey(userId));
    if (raw) {
      const saved = JSON.parse(raw) as Partial<LocalPrefs>;
      return { shelves: saved.shelves, requested: saved.requested ?? [] };
    }
  } catch {}
  return { requested: [] };
}

export function savePrefs(db: DB) {
  try {
    const prefs: LocalPrefs = { requested: db.requested };
    localStorage.setItem(prefsKey(db.meId), JSON.stringify(prefs));
  } catch {}
}

const bookFromRow = (r: BookRow): Book => ({
  id: r.id,
  title: r.title,
  author: r.author,
  isbn: r.isbn ?? undefined,
  coverId: r.cover_id ?? undefined,
  cover: r.cover ?? undefined,
  pages: r.pages ?? undefined,
  sections: r.sections,
  sectionLabel: r.section_label === "Part" ? "Part" : "Chapter",
  blurb: r.blurb ?? undefined,
});

const bookToRow = (b: Book): BookRow => ({
  id: b.id,
  title: b.title,
  author: b.author,
  isbn: b.isbn ?? null,
  cover_id: b.coverId ?? null,
  cover: b.cover ?? null,
  pages: b.pages ? Math.round(b.pages) : null,
  sections: b.sections,
  section_label: b.sectionLabel,
  blurb: b.blurb ?? null,
});

const shelfFromRow = (r: ShelfRow): ShelfEntry => ({
  bookId: r.book_id,
  shelf: r.shelf,
  rating: r.rating == null ? undefined : Number(r.rating),
  addedAt: r.added_at,
  readAt: r.read_at ?? undefined,
});

const shelfToRow = (userId: string, s: ShelfEntry) => ({
  user_id: userId,
  book_id: s.bookId,
  shelf: s.shelf,
  rating: validRating(s.rating) ?? null,
  ...(s.addedAt ? { added_at: s.addedAt } : {}),
  read_at: s.readAt ?? null,
});

// Every book a club points at, so only those (plus shelf books) get loaded.
function bookIdsIn(club: Club): string[] {
  return [
    club.currentBookId,
    ...(club.pastReads ?? []).map((p) => p.bookId),
    ...club.polls.flatMap((p) => [p.winnerBookId, ...p.options.map((o) => o.bookId)]),
    ...club.drafts.flatMap((d) => d.bookIds ?? []),
    ...club.threads.map((t) => t.bookId),
  ].filter((id): id is string => Boolean(id));
}

// Supabase returns at most 1,000 rows per request; a Goodreads library can be bigger.
const PAGE = 1000;
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function clubFromRow(r: ClubRow, members: Membership[]): Club {
  const c = r.content ?? {};
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    neighbourhood: r.neighbourhood,
    cadence: r.cadence,
    openToMembers: r.open_to_members,
    sizeCap: r.size_cap,
    currentBookId: r.current_book_id ?? undefined,
    members,
    polls: c.polls ?? [],
    meetups: c.meetups ?? [],
    threads: c.threads ?? [],
    drafts: c.drafts ?? [],
    announcements: c.announcements ?? [],
    joinRequests: c.joinRequests ?? [],
    pastReads: c.pastReads ?? [],
  };
}

function clubToRow(club: Club): ClubRow {
  const content: ClubContent = {
    polls: club.polls,
    meetups: club.meetups,
    threads: club.threads,
    drafts: club.drafts,
    announcements: club.announcements,
    joinRequests: club.joinRequests,
    pastReads: club.pastReads ?? [],
  };
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    neighbourhood: club.neighbourhood,
    cadence: club.cadence,
    open_to_members: club.openToMembers,
    size_cap: club.sizeCap,
    current_book_id: club.currentBookId ?? null,
    content,
  };
}

// When each club was last saved, as loaded. A save only goes through if nobody
// else saved the club since, so one member's change never silently erases
// another's (e.g. two people posting at once).
const savedAtByClub = new Map<string, string>();

export class ConflictError extends Error {}

export async function loadRemote(supabase: SupabaseClient, userId: string): Promise<DB> {
  // Privacy rules return only clubs you're in, plus clubs open to new members.
  const clubsRes = await supabase
    .from("clubs")
    .select("id, name, description, neighbourhood, cadence, open_to_members, size_cap, current_book_id, content, updated_at")
    .order("created_at", { ascending: false });
  if (clubsRes.error) throw clubsRes.error;
  const clubRows = (clubsRes.data ?? []) as (ClubRow & { updated_at: string })[];

  const membersRes = clubRows.length
    ? await supabase.from("club_members").select("club_id, user_id, role, progress").in("club_id", clubRows.map((c) => c.id)).order("joined_at")
    : { data: [] as MemberRow[], error: null };
  if (membersRes.error) throw membersRes.error;
  const memberRows = (membersRes.data ?? []) as MemberRow[];

  const ids = Array.from(new Set([userId, ...memberRows.map((m) => m.user_id)]));
  const [profilesRes, shelfRows] = await Promise.all([
    // "*" so this keeps working before 0006_avatars.sql adds avatar_url.
    supabase.from("profiles").select("*").in("id", ids),
    // Your shelves, plus clubmates' (the co-host's shortlist reads their want-to-read).
    fetchAll<ShelfRow>((from, to) =>
      supabase.from("shelf_entries").select("user_id, book_id, shelf, rating, added_at, read_at").in("user_id", ids).order("added_at", { ascending: false }).order("book_id").range(from, to),
    ),
  ]);
  if (profilesRes.error) throw profilesRes.error;

  const users = new Map<string, User>();
  for (const p of (profilesRes.data ?? []) as { id: string; name: string; avatar_url?: string | null }[]) {
    users.set(p.id, { id: p.id, name: p.name || "Reader", color: colorFor(p.id), avatar: p.avatar_url ?? undefined });
  }
  if (!users.has(userId)) users.set(userId, { id: userId, name: "You", color: colorFor(userId) });

  savedAtByClub.clear();
  for (const r of clubRows) {
    savedAtByClub.set(r.id, r.updated_at);
  }

  const clubs = clubRows.map((r) =>
    clubFromRow(
      r,
      memberRows.filter((m) => m.club_id === r.id).map((m) => ({ userId: m.user_id, role: m.role, progress: m.progress })),
    ),
  );

  const shelves: DB["shelves"] = {};
  for (const r of shelfRows) (shelves[r.user_id] ??= []).push(shelfFromRow(r));

  const prefs = loadPrefs(userId);
  const legacy = shelves[userId]?.length ? [] : (prefs.shelves?.[userId] ?? []);

  // Only the books something here points at. The catalogue grows with every
  // Goodreads import, so loading all of it would get slow.
  const wanted = new Set([...clubs.flatMap(bookIdsIn), ...shelfRows.map((r) => r.book_id), ...legacy.map((s) => s.bookId)]);
  const books: Book[] = [];
  for (const part of chunks(Array.from(wanted), 150)) {
    const res = await supabase.from("books").select("id, title, author, isbn, cover_id, cover, pages, sections, section_label, blurb").in("id", part);
    if (res.error) throw res.error;
    books.push(...((res.data ?? []) as BookRow[]).map(bookFromRow));
  }

  // Shelves saved on this device before they moved to your account: copy them
  // over once (only books that made it into the catalogue), then forget them.
  if (legacy.length) {
    const known = new Set(books.map((b) => b.id));
    const keep = legacy.filter((s) => known.has(s.bookId));
    for (const part of chunks(keep, 500)) {
      await check(supabase.from("shelf_entries").upsert(part.map((s) => shelfToRow(userId, s)), { onConflict: "user_id,book_id", ignoreDuplicates: true }));
    }
    if (keep.length) shelves[userId] = keep;
  }

  return {
    version: DB_VERSION,
    meId: userId,
    requested: prefs.requested,
    shelves,
    users: Array.from(users.values()),
    books,
    clubs,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function check<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const res = await p;
  if (res.error) throw new Error(res.error.message);
  return res;
}

// Writes the difference between two versions of the DB to Supabase.
export async function saveChanges(supabase: SupabaseClient, prev: DB, next: DB) {
  // 1. Books first, since clubs point at them.
  // Only books something points at are loaded, so a "new" book may already be
  // in the shared catalogue (say, someone else imported it from Goodreads):
  // add it without overwriting the cover they picked.
  const prevBooks = new Map(prev.books.map((b) => [b.id, b]));
  const newBooks = next.books.filter((b) => !prevBooks.has(b.id));
  const changedBooks = next.books.filter((b) => prevBooks.has(b.id) && !same(prevBooks.get(b.id), b));
  for (const part of chunks(newBooks, 500)) await check(supabase.from("books").upsert(part.map(bookToRow), { ignoreDuplicates: true }));
  for (const part of chunks(changedBooks, 500)) await check(supabase.from("books").upsert(part.map(bookToRow)));

  // Your shelves. Other people's are read-only here.
  const prevShelf = new Map((prev.shelves[prev.meId] ?? []).map((s) => [s.bookId, s]));
  const nextShelf = next.shelves[next.meId] ?? [];
  const changedShelf = nextShelf.filter((s) => !same(prevShelf.get(s.bookId), s));
  for (const part of chunks(changedShelf, 500)) {
    await check(supabase.from("shelf_entries").upsert(part.map((s) => shelfToRow(next.meId, s)), { onConflict: "user_id,book_id" }));
  }
  const kept = new Set(nextShelf.map((s) => s.bookId));
  const removed = Array.from(prevShelf.keys()).filter((id) => !kept.has(id));
  for (const part of chunks(removed, 150)) {
    await check(supabase.from("shelf_entries").delete().eq("user_id", next.meId).in("book_id", part));
  }

  // 2. Clubs: deleted, new, changed.
  const prevClubs = new Map(prev.clubs.map((c) => [c.id, c]));
  const nextIds = new Set(next.clubs.map((c) => c.id));
  for (const c of prev.clubs) {
    if (!nextIds.has(c.id)) await check(supabase.from("clubs").delete().eq("id", c.id));
  }

  for (const club of next.clubs) {
    const before = prevClubs.get(club.id);
    if (same(before, club)) continue;
    const row = clubToRow(club);

    if (!before) {
      // Creating a club makes you its host (a database trigger adds you).
      const { data } = await check(supabase.from("clubs").insert(row).select("updated_at").single());
      savedAtByClub.set(club.id, (data as { updated_at: string }).updated_at);
    } else {
      if (!same({ ...before, members: null }, { ...club, members: null })) {
        const { id, ...changes } = row;
        let query = supabase.from("clubs").update(changes).eq("id", id);
        const savedAt = savedAtByClub.get(id);
        if (savedAt) query = query.eq("updated_at", savedAt);
        const { data } = await check(query.select("updated_at"));
        const rows = (data ?? []) as { updated_at: string }[];
        if (!rows.length) throw new ConflictError("someone else changed this club at the same time");
        savedAtByClub.set(id, rows[0].updated_at);
      }
    }

    // 3. Members of this club. Only people with accounts are stored.
    const beforeMembers = new Map((before?.members ?? []).map((m) => [m.userId, m]));
    const afterMembers = new Map(club.members.map((m) => [m.userId, m]));
    for (const m of club.members) {
      if (!isAccountId(m.userId)) continue;
      const old = beforeMembers.get(m.userId);
      if (!old) {
        if (!before && m.userId === next.meId) continue; // added by the trigger
        await check(supabase.from("club_members").insert({ club_id: club.id, user_id: m.userId, role: m.role, progress: m.progress }));
      } else if (!same(old, m)) {
        await check(supabase.from("club_members").update({ role: m.role, progress: m.progress }).eq("club_id", club.id).eq("user_id", m.userId));
      }
    }
    for (const m of before?.members ?? []) {
      if (isAccountId(m.userId) && !afterMembers.has(m.userId)) {
        await check(supabase.from("club_members").delete().eq("club_id", club.id).eq("user_id", m.userId));
      }
    }
  }
}
