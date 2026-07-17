import { NextResponse, type NextRequest } from "next/server";
import { validatePassword } from "@/lib/customer-auth";
import {
  PASSWORD_RECOVERY_COOKIE,
  customerCookieOptions,
} from "@/lib/supabase/customer-cookie";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

interface ResetPasswordBody {
  password?: string;
}

export async function POST(request: NextRequest) {
  if (
    request.headers.get("origin") !== request.nextUrl.origin ||
    request.headers.get("x-catchus-action") !== "reset-password"
  ) {
    return NextResponse.json(
      { error: "Invalid password reset request." },
      { status: 403 }
    );
  }

  if (request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value !== "1") {
    return NextResponse.json(
      { error: "This reset link has expired or is invalid." },
      { status: 401 }
    );
  }

  const body: ResetPasswordBody = await request.json().catch(() => ({}));
  const passwordResult = validatePassword(body.password ?? "");
  if (!passwordResult.valid) {
    return NextResponse.json(
      { error: passwordResult.message },
      { status: 400 }
    );
  }

  const supabase = createCustomerServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json(
      { error: "This reset link has expired or is invalid." },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) {
    return NextResponse.json(
      { error: "Unable to update your password." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "", {
    ...customerCookieOptions,
    httpOnly: true,
    maxAge: 0,
  });
  return response;
}
