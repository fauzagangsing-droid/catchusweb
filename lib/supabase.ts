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

// Shared anonymous client for server-side public catalog queries. It never
// carries an authenticated user session or elevated credentials; Supabase Row
// Level Security policies determine what the anon key may read and write.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Admin and customer sessions use their dedicated browser/SSR clients.
    persistSession: false,
  },
  global: {
    // Product and category CRUD happens directly in Supabase. Explicitly opt
    // public catalog reads out of Next's persistent fetch cache so a deleted
    // row cannot survive in an older joined-query response.
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
