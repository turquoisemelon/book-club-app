import type { SupabaseClient } from "@supabase/supabase-js";

// Where to send someone once their sign-in link has worked.
// - A specific page asked for in the link (anything but the old /account default) wins.
// - Someone signing in for the very first time goes to their account to set a name.
// - Everyone else goes home.
// Invite links still work either way: PendingInvite takes people back to the invite.
export async function afterSignIn(supabase: SupabaseClient, next: string | null): Promise<string> {
  if (next && next !== "/account" && next.startsWith("/") && !next.startsWith("//")) return next;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return "/";
  // Supabase confirms the email on the first link someone opens, so a brand-new
  // account was confirmed moments ago; a returning one was confirmed long before.
  const confirmed = user.email_confirmed_at ?? user.created_at;
  const isNew = Date.now() - new Date(confirmed).getTime() < 10 * 60 * 1000;
  return isNew ? "/account" : "/";
}
