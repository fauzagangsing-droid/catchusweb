import { NextResponse, type NextRequest } from "next/server";
import { updateOrderDiscordNotification } from "@/lib/discord";
import { friendlyOrderError } from "@/lib/orders";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

interface PaidRouteContext {
  params: { orderNumber: string };
}

export async function POST(request: NextRequest, { params }: PaidRouteContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan pembayaran tidak valid." }, { status: 403 });
  }

  const supabase = createCustomerServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json(
      { error: "Sesi Anda telah berakhir. Silakan masuk kembali." },
      { status: 401 }
    );
  }

  const { data: order, error } = await supabase.rpc("mark_order_paid", {
    p_order_number: params.orderNumber,
  });

  if (error || !order) {
    return NextResponse.json(
      { error: friendlyOrderError(error?.message ?? "") },
      { status: 400 }
    );
  }

  await updateOrderDiscordNotification(order);
  return NextResponse.json({ success: true });
}
