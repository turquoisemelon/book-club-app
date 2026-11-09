// Loads and saves the app's data in Supabase for signed-in people.
//
// The screens keep working on the same in-memory DB shape as the local
// prototype. After each change, `saveChanges` compares the DB before and after
// and writes only what changed: books, club rows, and member rows.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book, Club, DB, Membership, User } from "./types";
import { DB_VERSION, makeSampleDB } from "./sample-data";

// Parts of a club stored together as JSON in clubs.content for now.
type ClubContent = Pick<Club, "polls" | "meetups" | "threads" | "drafts" | "announcements" | "joinRequests" | "pastReads"> & {
  // People who appear in a club's history but don't have an account yet,
  // e.g. members of a club brought over from this device.
  guests?: User[];
};

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

// Settings people keep per device: shelves, join requests, host/member view.
type LocalPrefs = Pick<DB, "viewAs" | "shelves" | "requested">;

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
    if (raw) return { viewAs: "host", shelves: {}, requested: [], ...JSON.parse(raw) };
  } catch {}
  return { viewAs: "host", shelves: {}, requested: [] };
}

export function savePrefs(db: DB) {
  try {
    const prefs: LocalPrefs = { viewAs: db.viewAs, shelves: db.shelves, requested: db.requested };
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
  pages: b.pages ?? null,
  sections: b.sections,
  section_label: b.sectionLabel,
  blurb: b.blurb ?? null,
});

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

function clubToRow(club: Club, guests: User[] | undefined): ClubRow {
  const content: ClubContent = {
    polls: club.polls,
    meetups: club.meetups,
    threads: club.threads,
    drafts: club.drafts,
    announcements: club.announcements,
    joinRequests: club.joinRequests,
    pastReads: club.pastReads ?? [],
  };
  if (guests?.length) content.guests = guests;
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

// Guests live in club content; remember which club each came from so saving
// a club keeps its guests.
const guestsByClub = new Map<string, User[]>();
// When each club was last saved, as loaded. A save only goes through if nobody
// else saved the club since, so one member's change never silently erases
// another's (e.g. two people posting at once).
const savedAtByClub = new Map<string, string>();

export class ConflictError extends Error {}

export async function loadRemote(supabase: SupabaseClient, userId: string): Promise<DB> {
  // Privacy rules return only clubs you're in, plus clubs open to new members.
  const [clubsRes, booksRes] = await Promise.all([
    supabase.from("clubs").select("id, name, description, neighbourhood, cadence, open_to_members, size_cap, current_book_id, content, updated_at").order("created_at", { ascending: false }),
    supabase.from("books").select("id, title, author, isbn, cover_id, cover, pages, sections, section_label, blurb"),
  ]);
  if (clubsRes.error) throw clubsRes.error;
  if (booksRes.error) throw booksRes.error;
  const clubRows = (clubsRes.data ?? []) as (ClubRow & { updated_at: string })[];

  const membersRes = clubRows.length
    ? await supabase.from("club_members").select("club_id, user_id, role, progress").in("club_id", clubRows.map((c) => c.id)).order("joined_at")
    : { data: [] as MemberRow[], error: null };
  if (membersRes.error) throw membersRes.error;
  const memberRows = (membersRes.data ?? []) as MemberRow[];

  const ids = Array.from(new Set([userId, ...memberRows.map((m) => m.user_id)]));
  const profilesRes = await supabase.from("profiles").select("id, name").in("id", ids);
  if (profilesRes.error) throw profilesRes.error;

  const users = new Map<string, User>();
  for (const p of (profilesRes.data ?? []) as { id: string; name: string }[]) {
    users.set(p.id, { id: p.id, name: p.name || "Reader", color: colorFor(p.id) });
  }
  if (!users.has(userId)) users.set(userId, { id: userId, name: "You", color: colorFor(userId) });

  guestsByClub.clear();
  savedAtByClub.clear();
  for (const r of clubRows) {
    savedAtByClub.set(r.id, r.updated_at);
    const guests = r.content?.guests ?? [];
    guestsByClub.set(r.id, guests);
    for (const g of guests) if (!users.has(g.id)) users.set(g.id, g);
  }

  const clubs = clubRows.map((r) =>
    clubFromRow(
      r,
      memberRows.filter((m) => m.club_id === r.id).map((m) => ({ userId: m.user_id, role: m.role, progress: m.progress })),
    ),
  );

  return {
    version: DB_VERSION,
    meId: userId,
    ...loadPrefs(userId),
    users: Array.from(users.values()),
    books: ((booksRes.data ?? []) as BookRow[]).map(bookFromRow),
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
  const prevBooks = new Map(prev.books.map((b) => [b.id, b]));
  const changedBooks = next.books.filter((b) => !same(prevBooks.get(b.id), b));
  if (changedBooks.length) await check(supabase.from("books").upsert(changedBooks.map(bookToRow)));

  // 2. Clubs: deleted, new, changed.
  const prevClubs = new Map(prev.clubs.map((c) => [c.id, c]));
  const nextIds = new Set(next.clubs.map((c) => c.id));
  for (const c of prev.clubs) {
    if (!nextIds.has(c.id)) await check(supabase.from("clubs").delete().eq("id", c.id));
  }

  for (const club of next.clubs) {
    const before = prevClubs.get(club.id);
    if (same(before, club)) continue;
    const row = clubToRow(club, guestsByClub.get(club.id));

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

// --- Bringing clubs over from the local prototype ---------------------------

// Replaces one person's id everywhere in a club: member lists, votes, RSVPs, posts.
function remapId<T>(value: T, from: string, to: string): T {
  if (value === from) return to as T;
  if (Array.isArray(value)) return value.map((v) => remapId(v, from, to)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k === from ? to : k, remapId(v, from, to)])) as T;
  }
  return value;
}

// Clubs you created on this device. The prototype's sample clubs are left out.
export function clubsToBringOver(local: DB) {
  const sampleIds = new Set(makeSampleDB().clubs.map((c) => c.id));
  return local.clubs.filter((c) => !sampleIds.has(c.id) && c.members.some((m) => m.userId === local.meId && m.role === "host"));
}

// Copies the chosen local clubs into your account. You become the host; other
// people in them are kept as guests (names on their posts and votes) until
// they join with their own accounts.
export async function bringOverClubs(supabase: SupabaseClient, userId: string, local: DB, clubIds: string[]) {
  const usersById = new Map(local.users.map((u) => [u.id, u]));
  for (const original of local.clubs.filter((c) => clubIds.includes(c.id))) {
    const club = remapId(structuredClone(original), local.meId, userId);
    const newId = `c-${crypto.randomUUID().slice(0, 12)}`;

    const bookIds = new Set<string>();
    if (club.currentBookId) bookIds.add(club.currentBookId);
    for (const p of club.pastReads ?? []) bookIds.add(p.bookId);
    for (const poll of club.polls) for (const o of poll.options) bookIds.add(o.bookId);
    for (const t of club.threads) if (t.bookId) bookIds.add(t.bookId);
    for (const d of club.drafts) for (const id of d.bookIds ?? []) bookIds.add(id);
    const books = local.books.filter((b) => bookIds.has(b.id));
    if (books.length) await check(supabase.from("books").upsert(books.map(bookToRow)));

    const me = club.members.find((m) => m.userId === userId);
    const guests = club.members
      .filter((m) => m.userId !== userId)
      .map((m) => usersById.get(m.userId))
      .filter((u): u is User => Boolean(u));
    const row = clubToRow({ ...club, id: newId }, guests);
    await check(supabase.from("clubs").insert(row));
    if (me?.progress) {
      await check(supabase.from("club_members").update({ progress: me.progress }).eq("club_id", newId).eq("user_id", userId));
    }
  }
}
