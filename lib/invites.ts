// Invite links: /join/<club>?invite=<secret>. The code lives in the
// club_invites table, visible to club members; the database checks it when
// someone opens the link or joins (see supabase/migrations/0003_invites.sql).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book } from "./types";

export type InvitePreview = {
  id: string;
  name: string;
  description: string;
  neighbourhood: string;
  cadence: string;
  memberCount: number;
  sizeCap: number;
  hostName: string | null;
  book: (Omit<Book, "isbn" | "coverId" | "cover"> & { isbn: string | null; coverId: number | null; cover: string | null }) | null;
  isMember: boolean;
};

export function inviteLink(origin: string, clubId: string, code: string) {
  return `${origin}/join/${clubId}?invite=${code}`;
}

export async function getInviteCode(supabase: SupabaseClient, clubId: string): Promise<string | null> {
  const { data, error } = await supabase.from("club_invites").select("code").eq("club_id", clubId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { code: string } | null)?.code ?? null;
}

// Makes a new link; the old one stops working.
export async function resetInviteCode(supabase: SupabaseClient, clubId: string): Promise<string> {
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { data, error } = await supabase.from("club_invites").update({ code, updated_at: new Date().toISOString() }).eq("club_id", clubId).select("code");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only the host can make a new link.");
  return code;
}

export async function previewInvite(supabase: SupabaseClient, clubId: string, code: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc("club_invite_preview", { cid: clubId, invite_code: code });
  if (error) throw new Error(error.message);
  return (data as InvitePreview | null) ?? null;
}

export async function joinWithInvite(supabase: SupabaseClient, clubId: string, code: string) {
  const { error } = await supabase.rpc("join_club", { cid: clubId, invite_code: code });
  if (error) throw new Error(error.message);
}

// Remembers an invite while someone signs in, so they come back to it.
const PENDING = "book-club-pending-invite";
export function rememberInvite(path: string) {
  try {
    localStorage.setItem(PENDING, JSON.stringify({ path, at: Date.now() }));
  } catch {}
}
export function takePendingInvite(): string | null {
  try {
    const raw = localStorage.getItem(PENDING);
    localStorage.removeItem(PENDING);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    // Only within a day, and only paths inside the app.
    if (Date.now() - at > 86400000 || !path.startsWith("/join/")) return null;
    return path;
  } catch {
    return null;
  }
}
