import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnabled, supabaseUrl } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Club, Membership, Thread } from "@/lib/types";
import { spanLabel } from "@/lib/progress";

// Emails people in a Talk topic (they started it or wrote in it) when someone
// posts a new message. The app calls this right after a message is saved.
//
// - Only for people who said yes: the app asks after they first write in a
//   topic, and they can change it on their account page. Off until then.
// - At most one email per topic until they open it again, so a lively chat
//   sends one email, not twenty.
// - No message preview if it would spoil a part of the book they haven't reached.
//
// Needs three settings in Vercel; until they're set this quietly does nothing:
//   SUPABASE_SECRET_KEY   Supabase > Project Settings > API Keys > secret key
//                         (older projects: the service_role key; that name works too)
//   RESEND_API_KEY        from resend.com, after verifying chapterclub.app
//   NOTIFY_EMAIL_FROM     optional, defaults to Chapter Club <hello@chapterclub.app>

const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const resendKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.NOTIFY_EMAIL_FROM || "Chapter Club <hello@chapterclub.app>";

// Only a message posted in the last few minutes can set off emails.
const FRESH_MS = 10 * 60 * 1000;

type ReadRow = { user_id: string; read_at: string | null; emailed_at: string | null };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

export async function POST(request: NextRequest) {
  if (!supabaseEnabled || !secretKey || !resendKey) return NextResponse.json({ sent: 0, skipped: "not set up" });

  const body = (await request.json().catch(() => null)) as { clubId?: unknown; threadId?: unknown } | null;
  const clubId = typeof body?.clubId === "string" ? body.clubId : "";
  const threadId = typeof body?.threadId === "string" ? body.threadId : "";
  if (!clubId || !threadId) return NextResponse.json({ error: "clubId and threadId are required" }, { status: 400 });

  // Who's asking: the signed-in person from the request's cookies.
  const auth = await createSupabaseServer();
  const { data: userData } = await auth.auth.getUser();
  const senderId = userData.user?.id;
  if (!senderId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // From here on, read with the secret key: it can see everyone's email address.
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const [clubRes, membersRes] = await Promise.all([
    admin.from("clubs").select("id, name, content").eq("id", clubId).maybeSingle(),
    admin.from("club_members").select("user_id, role, progress").eq("club_id", clubId),
  ]);
  if (clubRes.error || membersRes.error || !clubRes.data) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const members = new Map(((membersRes.data ?? []) as { user_id: string; role: Membership["role"]; progress: number }[]).map((m) => [m.user_id, m]));
  if (!members.has(senderId)) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const content = (clubRes.data.content ?? {}) as Partial<Club>;
  const thread = (content.threads ?? []).find((t: Thread) => t.id === threadId);
  // The newest message must be the sender's, and new. This stops anyone from
  // re-sending emails about an old message.
  const post = thread?.posts.at(-1);
  if (!thread || !post || post.userId !== senderId || Date.now() - time(post.at) > FRESH_MS) {
    return NextResponse.json({ sent: 0, skipped: "no new message from you" });
  }

  // Everyone in the topic, except the sender and anyone who's left the club.
  const inTopic = new Set([thread.createdBy, ...thread.posts.map((p) => p.userId)]);
  const candidates = Array.from(inTopic).filter((id): id is string => !!id && id !== senderId && members.has(id));
  if (!candidates.length) return NextResponse.json({ sent: 0 });

  const [profilesRes, readsRes] = await Promise.all([
    admin.from("profiles").select("id, name, email_talk").in("id", [senderId, ...candidates]),
    admin.from("talk_reads").select("user_id, read_at, emailed_at").eq("club_id", clubId).eq("thread_id", threadId).in("user_id", candidates),
  ]);
  // Before 0008_talk_notifications.sql runs, these columns and tables don't exist.
  if (profilesRes.error || readsRes.error) return NextResponse.json({ sent: 0, skipped: "run 0008_talk_notifications.sql" });

  const profiles = new Map(((profilesRes.data ?? []) as { id: string; name: string; email_talk: boolean | null }[]).map((p) => [p.id, p]));
  const reads = new Map(((readsRes.data ?? []) as ReadRow[]).map((r) => [r.user_id, r]));
  const senderName = profiles.get(senderId)?.name || "Someone";

  const recipients = candidates.filter((id) => {
    if (profiles.get(id)?.email_talk !== true) return false;
    const r = reads.get(id);
    // Already emailed about this topic and haven't opened it since: wait.
    if (r?.emailed_at && time(r.emailed_at) > time(r.read_at)) return false;
    // Opened it after this message was posted: they've seen it.
    if (r?.read_at && time(r.read_at) >= time(post.at)) return false;
    return true;
  });

  const link = `${request.nextUrl.origin}/clubs/${encodeURIComponent(clubId)}/talk/${encodeURIComponent(threadId)}`;
  const settings = `${request.nextUrl.origin}/account`;
  const club = clubRes.data.name as string;
  let sent = 0;

  for (const id of recipients) {
    const { data } = await admin.auth.admin.getUserById(id);
    const email = data.user?.email;
    if (!email) continue;

    // Skip the preview if the topic is past where they've read to.
    const canSee = (members.get(id)?.progress ?? 0) >= thread.gate;
    const preview = canSee ? clip(post.text, 300) : `This topic has spoilers for ${spanLabel(thread.gate)}, so we've left the message out.`;
    const subject = `${senderName} replied in “${clip(thread.title, 60)}”`;
    const text = `${senderName} in ${club}:\n\n${preview}\n\nReply: ${link}\n\nYou asked for emails about Talk topics you're in. Turn these emails off: ${settings}`;
    const html = `<div style="font-family:Georgia,serif;max-width:480px;color:#1f2a24">
<p style="font:14px system-ui,sans-serif;color:#6b6f68;margin:0 0 8px">${escapeHtml(club)} · Talk</p>
<p style="font-size:18px;margin:0 0 12px"><b>${escapeHtml(senderName)}</b> replied in “${escapeHtml(thread.title)}”</p>
<p style="font:15px/1.5 system-ui,sans-serif;white-space:pre-line;border-left:3px solid #e7dfd2;padding-left:12px;margin:0 0 20px">${escapeHtml(preview)}</p>
<p style="margin:0 0 24px"><a href="${link}" style="font:600 15px system-ui,sans-serif;background:#2f5d50;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Open the conversation</a></p>
<p style="font:12px system-ui,sans-serif;color:#6b6f68;margin:0">You asked for emails about Talk topics you're in. We'll email you once until you open it again. <a href="${settings}" style="color:#6b6f68">Turn these emails off</a>.</p>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: email, subject, text, html }),
    });
    if (!res.ok) {
      console.error("Talk email failed", res.status, await res.text().catch(() => ""));
      continue;
    }
    sent++;
    await admin
      .from("talk_reads")
      .upsert({ user_id: id, club_id: clubId, thread_id: threadId, emailed_at: new Date().toISOString() }, { onConflict: "user_id,club_id,thread_id" });
  }

  return NextResponse.json({ sent });
}
