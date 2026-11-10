import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

// The sign-in email links here (see docs/supabase-setup.md, step 7).
// Unlike /auth/callback, this works whichever browser or device opens the
// email, because the link carries everything needed to finish signing in.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next") ?? "/account";
  // Only allow redirects back into this app.
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (supabaseEnabled && tokenHash) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(dest, request.url));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
}
