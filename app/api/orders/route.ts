import { NextResponse, type NextRequest } from "next/server";
import { createOrderDiscordNotification } from "@/lib/discord";
import { friendlyOrderError } from "@/lib/orders";
import { verifyShippingQuoteToken } from "@/lib/shipping-quotes";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CheckoutFormValues } from "@/types/order";

function isCheckoutPayload(value: unknown): value is CheckoutFormValues {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.addressId === "string" &&
    typeof payload.shippingQuoteToken === "string" &&
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

  const quote = verifyShippingQuoteToken(payload.shippingQuoteToken);
  if (!quote || quote.userId !== user.id) {
    return NextResponse.json(
      { error: "Opsi pengiriman telah kedaluwarsa. Pilih kurir kembali." },
      { status: 400 }
    );
  }

  const { data: address, error: addressError } = await supabase
    .from("shipping_addresses")
    .select("id, village_code")
    .eq("id", payload.addressId)
    .maybeSingle();
  if (addressError || !address || address.village_code !== quote.destinationVillageCode) {
    return NextResponse.json({ error: "Alamat pengiriman tidak valid." }, { status: 400 });
  }

  const orderClient = createServiceRoleClient();
  const { data: order, error } = await orderClient.rpc("place_order_with_shipping", {
      p_user_id: user.id,
      p_payment_method: payload.paymentMethod,
      p_address_id: payload.addressId,
      p_courier_code: quote.courierCode,
      p_courier_name: quote.courierName,
      p_shipping_cost: quote.shippingCost,
      p_shipping_estimation: quote.estimation,
      p_shipping_weight: quote.weight,
      p_destination_village_code: quote.destinationVillageCode,
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
