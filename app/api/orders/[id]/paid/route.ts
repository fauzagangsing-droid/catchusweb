import { NextResponse, type NextRequest } from "next/server";
import { updateOrderDiscordNotification } from "@/lib/discord";
import { friendlyOrderError } from "@/lib/orders";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

interface PaidRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: PaidRouteContext) {
  const { id } = await params;
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan pembayaran tidak valid." }, { status: 403 });
  }

  const supabase = await createCustomerServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json({ error: "Sesi Anda telah berakhir. Silakan masuk kembali." }, { status: 401 });
  }

  // `id` is the shared App Router slug name; this legacy endpoint still
  // receives the order number as its URL value for backward compatibility.
  const { data: order, error } = await supabase.rpc("mark_order_paid", {
    p_order_number: id,
  });
  if (error || !order) {
    return NextResponse.json({ error: friendlyOrderError(error?.message ?? "") }, { status: 400 });
  }
  await updateOrderDiscordNotification(order);
  return NextResponse.json({ success: true });
}
