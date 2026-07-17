import type { CookieOptions } from "@supabase/ssr";

export const CUSTOMER_AUTH_COOKIE = "catchus-customer-auth";
export const SESSION_ONLY_COOKIE = "catchus-session-only";
export const PASSWORD_RECOVERY_COOKIE = "catchus-password-recovery";

export const customerCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export function sessionAwareCookieOptions(
  options: CookieOptions,
  sessionOnly: boolean
): CookieOptions {
  if (!sessionOnly) return options;

  const { expires: _expires, maxAge: _maxAge, ...sessionOptions } = options;
  return sessionOptions;
}
