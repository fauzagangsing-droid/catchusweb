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
 * Browser-only Supabase client for admin sessions, authenticated admin data,
 * and public browser queries such as product search.
 *
 * This is intentionally a separate instance from the shared `supabase`
 * client in `lib/supabase.ts`, which does not persist or refresh sessions.
 *
 * This client persists the admin session in browser storage and auto-refreshes
 * its token. Customer authentication uses the separate cookie-based clients
 * under `lib/supabase/customer-*`.
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
