import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnabled, supabaseKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;

// One shared client for the browser. Returns null while Supabase isn't set up.
export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  client ??= createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
