import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  CUSTOMER_AUTH_COOKIE,
  SESSION_ONLY_COOKIE,
  customerCookieOptions,
  sessionAwareCookieOptions,
} from "@/lib/supabase/customer-cookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function copySessionResponse(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((header) => {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  });
  return target;
}

export async function middleware(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === "1";
  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      ...customerCookieOptions,
      name: CUSTOMER_AUTH_COOKIE,
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(
            name,
            value,
            sessionAwareCookieOptions(options, sessionOnly)
          );
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/account") && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return copySessionResponse(response, NextResponse.redirect(loginUrl));
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    return copySessionResponse(
      response,
      NextResponse.redirect(new URL("/", request.url))
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!admin(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
