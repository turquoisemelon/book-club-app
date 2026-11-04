// Supabase settings come from environment variables (set in Vercel).
// Until they are set, the app runs exactly as the local-only prototype.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase calls this the "publishable" key (older projects: "anon" key).
// It is safe to expose in the browser; the database rules protect the data.
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseEnabled = Boolean(supabaseUrl && supabaseKey);
