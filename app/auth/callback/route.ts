import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/customer-auth";
import { PASSWORD_RECOVERY_COOKIE, customerCookieOptions } from "@/lib/supabase/customer-cookie";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"), "/account");

  if (code) {
    const supabase = await createCustomerServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      if (next.startsWith("/reset-password")) {
        response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
          ...customerCookieOptions,
          httpOnly: true,
          maxAge: 15 * 60,
        });
      }
      return response;
    }
  }

  const errorPath = next.startsWith("/reset-password")
    ? "/reset-password?error=invalid_token"
    : "/login?error=invalid_verification";
  return NextResponse.redirect(new URL(errorPath, requestUrl.origin));
}
