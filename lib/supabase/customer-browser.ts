"use client";

import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import type { Database } from "@/types/database";
import {
  CUSTOMER_AUTH_COOKIE,
  SESSION_ONLY_COOKIE,
  customerCookieOptions,
  sessionAwareCookieOptions,
} from "@/lib/supabase/customer-cookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getBrowserCookies() {
  return Object.entries(parse(document.cookie)).map(([name, value]) => ({
    name,
    value: value ?? "",
  }));
}

function setBrowserCookies(
  cookiesToSet: { name: string; value: string; options: CookieOptions }[]
) {
  const sessionOnly = parse(document.cookie)[SESSION_ONLY_COOKIE] === "1";

  cookiesToSet.forEach(({ name, value, options }) => {
    document.cookie = serialize(
      name,
      value,
      sessionAwareCookieOptions(options, sessionOnly)
    );
  });
}

export function setRememberMe(remember: boolean) {
  document.cookie = serialize(SESSION_ONLY_COOKIE, remember ? "" : "1", {
    ...customerCookieOptions,
    maxAge: remember ? 0 : undefined,
  });
}

export function createCustomerBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }
  return createBrowserClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
    cookieOptions: {
      ...customerCookieOptions,
      name: CUSTOMER_AUTH_COOKIE,
    },
    cookies: {
      getAll: getBrowserCookies,
      setAll: setBrowserCookies,
    },
  });
}
