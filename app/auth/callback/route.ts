import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";
import { afterSignIn } from "@/lib/supabase/after-sign-in";

// The sign-in email links here. Swaps the one-time code for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (supabaseEnabled && code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${await afterSignIn(supabase, searchParams.get("next"))}`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=link`);
}
