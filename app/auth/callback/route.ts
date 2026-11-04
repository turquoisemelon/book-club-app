import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

// The sign-in email links here. Swaps the one-time code for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Only allow redirects back into this app.
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (supabaseEnabled && code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${dest}`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=link`);
}
