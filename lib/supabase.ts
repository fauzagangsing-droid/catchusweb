import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at build/runtime instead of silently returning empty data,
  // so a missing .env.local is obvious instead of showing up as "no products".
  throw new Error(
    "Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL " +
      "and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
  );
}

// Single shared client. Only the public anon key is used here — this client
// is safe to reference from Server Components, Route Handlers, or (if ever
// needed) Client Components alike, because it never has elevated privileges.
// Row Level Security policies (see supabase/schema.sql) are what actually
// restrict what this key can read/write, not this file.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // No user sessions/auth in Phase 2 — this is a read-only public catalog client.
    persistSession: false,
  },
});
