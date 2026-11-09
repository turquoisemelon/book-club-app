import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnabled, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

// Keeps the sign-in session fresh: Supabase rotates its tokens, and the new
// ones have to be written back as cookies on each request.
export async function proxy(request: NextRequest) {
  if (!supabaseEnabled) return NextResponse.next();

  // When the link's return address isn't on Supabase's allowed list, Supabase
  // sends people to the Site URL instead (usually the home page), with the
  // one-time code or an error attached. Finish the sign-in from wherever that is.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/auth/callback") {
    if (searchParams.has("code")) {
      const url = new URL("/auth/callback", request.url);
      url.searchParams.set("code", searchParams.get("code")!);
      url.searchParams.set("next", "/account");
      return NextResponse.redirect(url);
    }
    if (searchParams.has("error_description") && pathname !== "/sign-in") {
      return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
    }
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
