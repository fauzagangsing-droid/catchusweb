import { NextResponse, type NextRequest } from "next/server";
import { createCustomerAdminClient } from "@/lib/supabase/customer-admin";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  const action = request.headers.get("x-catchus-action");
  if (origin !== request.nextUrl.origin || action !== "delete-account") {
    return NextResponse.json({ error: "Invalid account deletion request." }, { status: 403 });
  }

  const supabase = await createCustomerServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  try {
    const admin = createCustomerAdminClient();
    const { data: avatarFiles } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
    const avatarPaths = (avatarFiles ?? []).map((file) => `${user.id}/${file.name}`);
    if (avatarPaths.length > 0) await admin.storage.from("avatars").remove(avatarPaths);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json({ error: "Unable to delete your account right now." }, { status: 500 });
    }

    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Account deletion is not configured." }, { status: 503 });
  }
}
