import { NextResponse, type NextRequest } from "next/server";
import { updateOrderDiscordNotification } from "@/lib/discord";
import { friendlyOrderError } from "@/lib/orders";
import { getAdminRequestClient } from "@/lib/supabase/admin-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { AdminOrderAction } from "@/types/order";
import type { ShippingStatus } from "@/types/database";

interface AdminOrderRouteContext {
  params: { orderId: string };
}

const ACTIONS: AdminOrderAction[] = [
  "approve_payment",
  "reject_payment",
  "mark_processing",
  "mark_shipped",
  "mark_completed",
  "cancel_order",
];
function isAdminOrderAction(value: unknown): value is AdminOrderAction {
  return typeof value === "string" && ACTIONS.includes(value as AdminOrderAction);
}

export async function GET(request: NextRequest, { params }: AdminOrderRouteContext) {
  const supabase = await getAdminRequestClient(request);
  if (!supabase) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 });
  const { data: order } = await supabase.from("orders").select("id, payment_proof_url").eq("id", params.orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!order.payment_proof_url) return NextResponse.json({ url: null });
  const service = createServiceRoleClient();
  const { data, error } = await service.storage.from("payment-proofs").createSignedUrl(order.payment_proof_url, 600);
  if (error) return NextResponse.json({ error: "Bukti tidak dapat dimuat." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

export async function PATCH(
  request: NextRequest,
  { params }: AdminOrderRouteContext
) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan admin tidak valid." }, { status: 403 });
  }

  const supabase = await getAdminRequestClient(request);
  if (!supabase) {
    return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Tindakan pesanan tidak valid." }, { status: 400 });
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  const action = payload?.action;

  if (action === "save_shipping") {
    const trackingNumber = payload?.trackingNumber;
    const shippingStatus = payload?.shippingStatus;
    const shippingStatuses: ShippingStatus[] = [
      "pending", "ready_to_ship", "shipped", "delivered", "returned", "cancelled",
    ];
    if (
      typeof trackingNumber !== "string" ||
      typeof shippingStatus !== "string" ||
      !shippingStatuses.includes(shippingStatus as ShippingStatus)
    ) {
      return NextResponse.json(
        { error: "Informasi pengiriman tidak valid." },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabase.rpc(
      "admin_save_order_shipping",
      {
        p_order_id: params.orderId,
        p_tracking_number: trackingNumber.trim() || null,
        p_shipping_status: shippingStatus as ShippingStatus,
      }
    );

    if (error || !order) {
      return NextResponse.json(
        { error: friendlyOrderError(error?.message ?? "") },
        { status: 400 }
      );
    }

    await updateOrderDiscordNotification(order);
    return NextResponse.json({ order });
  }

  if (!isAdminOrderAction(action)) {
    return NextResponse.json({ error: "Tindakan pesanan tidak valid." }, { status: 400 });
  }

  const { data: order, error } = await supabase.rpc("admin_update_order", {
      p_order_id: params.orderId,
      p_action: action,
      p_rejection_reason:
        typeof payload?.rejectionReason === "string"
          ? payload.rejectionReason.trim() || null
          : null,
    });

  if (error || !order) {
    return NextResponse.json(
      { error: friendlyOrderError(error?.message ?? "") },
      { status: 400 }
    );
  }

  await updateOrderDiscordNotification(order);

  return NextResponse.json({ order });
}
