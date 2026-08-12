import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import {
  CUSTOMER_AUTH_COOKIE,
  SESSION_ONLY_COOKIE,
  customerCookieOptions,
  sessionAwareCookieOptions,
} from "@/lib/supabase/customer-cookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createCustomerServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }
  const cookieStore = await cookies();
  const sessionOnly = cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";

  return createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      ...customerCookieOptions,
      name: CUSTOMER_AUTH_COOKIE,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              name,
              value,
              sessionAwareCookieOptions(options, sessionOnly)
            );
          });
        } catch {
          // Server Components cannot write cookies. Middleware refreshes them.
        }
      },
    },
  });
}
