import { NextResponse, type NextRequest } from "next/server";
import { createOrderDiscordNotification } from "@/lib/discord";
import { friendlyOrderError } from "@/lib/orders";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import type { CheckoutFormValues } from "@/types/order";

function isCheckoutPayload(value: unknown): value is CheckoutFormValues {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.fullName === "string" &&
    typeof payload.phone === "string" &&
    typeof payload.address === "string" &&
    typeof payload.city === "string" &&
    typeof payload.province === "string" &&
    typeof payload.postalCode === "string" &&
    (payload.paymentMethod === "qris" ||
      payload.paymentMethod === "dana" ||
      payload.paymentMethod === "bank_transfer")
  );
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan checkout tidak valid." }, { status: 403 });
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan checkout tidak valid." }, { status: 400 });
  }

  if (!isCheckoutPayload(payload)) {
    return NextResponse.json({ error: "Lengkapi seluruh data checkout." }, { status: 400 });
  }

  const { data: order, error } = await supabase.rpc("place_order", {
      p_payment_method: payload.paymentMethod,
      p_shipping_full_name: payload.fullName,
      p_shipping_phone: payload.phone,
      p_shipping_address: payload.address,
      p_shipping_city: payload.city,
      p_shipping_province: payload.province,
      p_shipping_postal_code: payload.postalCode,
    });

  if (error || !order) {
    return NextResponse.json(
      { error: friendlyOrderError(error?.message ?? "") },
      { status: 400 }
    );
  }

  const discordMessageId = await createOrderDiscordNotification(order);
  if (discordMessageId) {
    const { error: discordIdError } = await supabase.rpc(
      "set_order_discord_message_id",
      { p_order_id: order.id, p_message_id: discordMessageId }
    );
    if (discordIdError) {
      console.error("Gagal menyimpan ID pesan Discord.", discordIdError);
    }
  }
  return NextResponse.json({ orderNumber: order.order_number }, { status: 201 });
}
