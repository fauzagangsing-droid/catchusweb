import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL " +
      "and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
  );
}

/**
 * Browser-only Supabase client, used exclusively for Admin Auth.
 *
 * This is intentionally a separate instance from the shared `supabase`
 * client in `lib/supabase.ts`. That client is a server-side singleton
 * (imported via `server-only`, `persistSession: false`) shared across every
 * request in the Node process — turning on session persistence there would
 * risk one visitor's admin session leaking into another visitor's request.
 *
 * This client instead persists the session in the browser (localStorage)
 * and auto-refreshes the token, which is exactly what a real per-browser
 * login session needs. It uses the same project URL/anon key — it is not a
 * new Supabase project or a new set of credentials, just a differently
 * configured instance for a different runtime context.
 *
 * Only import this from Client Components ("use client").
 */
export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
