import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnabled, supabaseUrl } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

// Join request emails. The app calls this right after:
//   { clubId }          someone asked to join: email the club's hosts
//   { clubId, userId }  a host let them in: email that person
//
// Each email goes out once per request, and only for a request made (or
// answered) in the last few minutes, so nobody can use this to send repeats.
// People can't flood a host either: it's one request per person per club.
//
// Uses the same Vercel settings as the Talk emails; until they're set this
// quietly does nothing:
//   SUPABASE_SECRET_KEY   Supabase > Project Settings > API Keys > secret key
//                         (older projects: the service_role key; that name works too)
//   RESEND_API_KEY        from resend.com, after verifying chapterclub.app
//   NOTIFY_EMAIL_FROM     optional, defaults to Chapter Club <hello@chapterclub.app>

const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const resendKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.NOTIFY_EMAIL_FROM || "Chapter Club <hello@chapterclub.app>";

const FRESH_MS = 10 * 60 * 1000;

type RequestRow = {
  user_id: string;
  note: string;
  status: string;
  created_at: string;
  decided_at: string | null;
  emailed_hosts_at: string | null;
  emailed_approved_at: string | null;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const fresh = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < FRESH_MS;

function page(kicker: string, headline: string, quote: string, button: string, link: string, footer: string) {
  return `<div style="font-family:Georgia,serif;max-width:480px;color:#1f2a24">
<p style="font:14px system-ui,sans-serif;color:#6b6f68;margin:0 0 8px">${escapeHtml(kicker)}</p>
<p style="font-size:18px;margin:0 0 12px">${headline}</p>
${quote ? `<p style="font:15px/1.5 system-ui,sans-serif;white-space:pre-line;border-left:3px solid #e7dfd2;padding-left:12px;margin:0 0 20px">${escapeHtml(quote)}</p>` : ""}
<p style="margin:0 0 24px"><a href="${link}" style="font:600 15px system-ui,sans-serif;background:#2f5d50;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">${escapeHtml(button)}</a></p>
<p style="font:12px system-ui,sans-serif;color:#6b6f68;margin:0">${footer}</p>
</div>`;
}

async function send(to: string, subject: string, text: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) console.error("Join request email failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

export async function POST(request: NextRequest) {
  if (!supabaseEnabled || !secretKey || !resendKey) return NextResponse.json({ sent: 0, skipped: "not set up" });

  const body = (await request.json().catch(() => null)) as { clubId?: unknown; userId?: unknown } | null;
  const clubId = typeof body?.clubId === "string" ? body.clubId : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!clubId) return NextResponse.json({ error: "clubId is required" }, { status: 400 });

  const auth = await createSupabaseServer();
  const { data: userData } = await auth.auth.getUser();
  const callerId = userData.user?.id;
  if (!callerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // From here on, read with the secret key: it can see email addresses.
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const requesterId = userId || callerId;

  const [clubRes, hostsRes, reqRes] = await Promise.all([
    admin.from("clubs").select("id, name").eq("id", clubId).maybeSingle(),
    admin.from("club_members").select("user_id").eq("club_id", clubId).eq("role", "host"),
    admin
      .from("join_requests")
      .select("user_id, note, status, created_at, decided_at, emailed_hosts_at, emailed_approved_at")
      .eq("club_id", clubId)
      .eq("user_id", requesterId)
      .maybeSingle(),
  ]);
  if (reqRes.error) return NextResponse.json({ sent: 0, skipped: "run 0009_join_requests.sql" });
  if (!clubRes.data || !reqRes.data) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const club = clubRes.data.name as string;
  const req = reqRes.data as RequestRow;
  const hostIds = ((hostsRes.data ?? []) as { user_id: string }[]).map((h) => h.user_id);
  const origin = request.nextUrl.origin;
  const clubLink = `${origin}/clubs/${encodeURIComponent(clubId)}`;
  const stamp = new Date().toISOString();

  const { data: profile } = await admin.from("profiles").select("name").eq("id", requesterId).maybeSingle();
  const name = (profile?.name as string | undefined) || "Someone";

  if (!userId) {
    // A new request: email the hosts, once.
    if (req.status !== "pending" || req.emailed_hosts_at || !fresh(req.created_at)) return NextResponse.json({ sent: 0 });
    // Mark it first, so two quick calls can't both send.
    const { data: marked } = await admin
      .from("join_requests")
      .update({ emailed_hosts_at: stamp })
      .eq("club_id", clubId)
      .eq("user_id", requesterId)
      .is("emailed_hosts_at", null)
      .select("user_id");
    if (!marked?.length) return NextResponse.json({ sent: 0 });

    const note = clip(req.note.trim(), 500);
    const subject = `${name} asked to join ${clip(club, 60)}`;
    const footer = `You're getting this because you host ${escapeHtml(club)} and it's open to new members. One email per request. To stop new requests, turn off &ldquo;Open to new members&rdquo; on the <a href="${clubLink}" style="color:#6b6f68">club page</a>.`;
    const text = `${name} asked to join ${club}.${note ? `\n\n“${note}”` : ""}\n\nApprove or decline: ${clubLink}\n\nYou're getting this because you host ${club} and it's open to new members. To stop new requests, turn off "Open to new members" on the club page.`;
    const html = page(`${club} · Join request`, `<b>${escapeHtml(name)}</b> asked to join your club`, note, "Approve or decline", clubLink, footer);

    let sent = 0;
    for (const id of hostIds) {
      const { data } = await admin.auth.admin.getUserById(id);
      const email = data.user?.email;
      if (email && (await send(email, subject, text, html))) sent++;
    }
    return NextResponse.json({ sent });
  }

  // An approval: only a host of the club can ask for this email, once.
  if (!hostIds.includes(callerId)) return NextResponse.json({ error: "Not a host" }, { status: 403 });
  if (req.status !== "approved" || req.emailed_approved_at || !fresh(req.decided_at)) return NextResponse.json({ sent: 0 });
  const { data: marked } = await admin
    .from("join_requests")
    .update({ emailed_approved_at: stamp })
    .eq("club_id", clubId)
    .eq("user_id", requesterId)
    .is("emailed_approved_at", null)
    .select("user_id");
  if (!marked?.length) return NextResponse.json({ sent: 0 });

  const { data } = await admin.auth.admin.getUserById(requesterId);
  const email = data.user?.email;
  if (!email) return NextResponse.json({ sent: 0 });
  const subject = `You're in: ${clip(club, 60)}`;
  const text = `The host of ${club} said yes. Welcome to the club!\n\nSee what they're reading and when they meet next: ${clubLink}`;
  const html = page(
    `${club} · Chapter Club`,
    `You're in <b>${escapeHtml(club)}</b>`,
    "",
    "Open the club",
    clubLink,
    "The host said yes to your request to join. See what the club is reading and when it meets next.",
  );
  return NextResponse.json({ sent: (await send(email, subject, text, html)) ? 1 : 0 });
}
