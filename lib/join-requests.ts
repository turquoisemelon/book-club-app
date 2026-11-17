// Asking to join a club from the directory, and hosts answering.
// The database does the checks (club open, not full, host only); see
// supabase/migrations/0009_join_requests.sql.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Club, JoinRequest } from "./types";

// Requests waiting for an answer. (Very old local data stored plain ids here.)
export function pendingRequests(club: Club): JoinRequest[] {
  return (club.joinRequests ?? []).filter((r): r is JoinRequest => typeof r === "object" && r !== null);
}

// Before 0009_join_requests.sql runs, these database functions don't exist.
export const notSetUp = (message: string) => /request_to_join|answer_join_request|schema cache|does not exist/i.test(message);

export async function sendJoinRequest(supabase: SupabaseClient, clubId: string, note: string) {
  const { error } = await supabase.rpc("request_to_join", { cid: clubId, hello: note.trim().slice(0, 500) });
  if (error) throw new Error(error.message);
  notify({ clubId });
}

export async function answerJoinRequest(supabase: SupabaseClient, clubId: string, userId: string, approve: boolean) {
  const { error } = await supabase.rpc("answer_join_request", { cid: clubId, requester: userId, approve });
  if (error) throw new Error(error.message);
  if (approve) notify({ clubId, userId });
}

// Asks the server to email the hosts about a new request ({ clubId }), or the
// person about being let in ({ clubId, userId }). Fire and forget: a missed
// email should never get in the way.
function notify(body: { clubId: string; userId?: string }) {
  fetch("/api/join-requests/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
