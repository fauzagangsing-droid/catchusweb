import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getAdminRequestClient(
  request: NextRequest
): Promise<SupabaseClient<Database> | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const accessToken = authorization.slice("Bearer ".length).trim();
  if (!accessToken) return null;

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(accessToken);
  if (!user || userError) return null;

  const { data: isAdmin, error: adminError } = await client.rpc("is_admin");
  if (!isAdmin || adminError) return null;

  return client;
}
