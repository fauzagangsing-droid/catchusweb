import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createOrderDiscordNotification } from "@/lib/discord";
import { friendlyOrderError } from "@/lib/orders";
import { verifyShippingQuoteToken } from "@/lib/shipping-quotes";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CheckoutFormValues } from "@/types/order";

const checkoutSchema = z.object({
  addressId: z.string().uuid(),
  shippingQuoteToken: z.string().min(1).max(4096),
  voucherCode: z.string().trim().max(50).optional(),
  paymentMethod: z.enum(["qris", "dana", "bank_transfer"]),
}).strict();

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan checkout tidak valid." }, { status: 403 });
  }

  const supabase = await createCustomerServerClient();
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

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Lengkapi seluruh data checkout." }, { status: 400 });
  }
  const checkout: CheckoutFormValues = parsed.data;

  const quote = verifyShippingQuoteToken(checkout.shippingQuoteToken);
  if (!quote || quote.userId !== user.id) {
    return NextResponse.json(
      { error: "Opsi pengiriman telah kedaluwarsa. Pilih kurir kembali." },
      { status: 400 }
    );
  }

  const { data: address, error: addressError } = await supabase
    .from("shipping_addresses")
    .select("id, village_code")
    .eq("id", checkout.addressId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (addressError || !address || address.village_code !== quote.destinationVillageCode) {
    return NextResponse.json({ error: "Alamat pengiriman tidak valid." }, { status: 400 });
  }

  const orderClient = createServiceRoleClient();
  const { data: order, error } = await orderClient.rpc("place_order_with_shipping", {
      p_user_id: user.id,
      p_payment_method: checkout.paymentMethod,
      p_address_id: checkout.addressId,
      p_courier_code: quote.courierCode,
      p_courier_name: quote.courierName,
      p_shipping_cost: quote.shippingCost,
      p_shipping_estimation: quote.estimation,
      p_shipping_weight: quote.weight,
      p_destination_village_code: quote.destinationVillageCode,
      p_voucher_code: checkout.voucherCode?.trim() || null,
    });

  if (error || !order) {
    return NextResponse.json(
      { error: friendlyOrderError(error?.message ?? "") },
      { status: 400 }
    );
  }

  const discordMessageId = await createOrderDiscordNotification(order);
  if (discordMessageId) {
    const { error: discordIdError } = await orderClient
      .from("orders")
      .update({ discord_message_id: discordMessageId })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .is("discord_message_id", null);
    if (discordIdError) {
      console.error("Gagal menyimpan ID pesan Discord.", discordIdError);
    }
  }
  return NextResponse.json({ orderNumber: order.order_number }, { status: 201 });
}
