import { supabaseBrowser } from "@/lib/supabase-browser";
import type {
  Order,
  OrderStatus,
  OrderWithItems,
  PaymentStatus,
} from "@/types/database";
import type { AdminOrderAction } from "@/types/order";

export interface AdminOrderFilters {
  search: string;
  paymentStatus: PaymentStatus | "all";
  orderStatus: OrderStatus | "all";
}

export async function getAdminOrders(filters: AdminOrderFilters): Promise<{
  data: OrderWithItems[];
  error: string | null;
}> {
  let query = supabaseBrowser
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }
  if (filters.orderStatus !== "all") {
    query = query.eq("order_status", filters.orderStatus);
  }

  const safeSearch = filters.search.trim().replace(/[%_,()]/g, "");
  if (safeSearch) {
    const pattern = `%${safeSearch}%`;
    query = query.or(
      `order_number.ilike.${pattern},customer_email.ilike.${pattern},shipping_full_name.ilike.${pattern}`
    );
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as OrderWithItems[], error: null };
}

async function updateAdminOrder(
  orderId: string,
  payload:
    | { action: AdminOrderAction }
    | {
        action: "save_shipping";
        trackingNumber: string;
      }
): Promise<{ data: Order | null; error: string | null }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();
  if (!session || sessionError) {
    return { data: null, error: "Sesi admin Anda telah berakhir." };
  }

  try {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      order?: Order;
      error?: string;
    };
    if (!response.ok || !result.order) {
      return { data: null, error: result.error ?? "Pesanan tidak dapat diperbarui." };
    }
    return { data: result.order, error: null };
  } catch {
    return { data: null, error: "Tidak dapat terhubung. Silakan coba lagi." };
  }
}

export async function runAdminOrderAction(
  orderId: string,
  action: AdminOrderAction
): Promise<{ data: Order | null; error: string | null }> {
  return updateAdminOrder(orderId, { action });
}

export async function saveAdminOrderShipping(
  orderId: string,
  trackingNumber: string
): Promise<{ data: Order | null; error: string | null }> {
  return updateAdminOrder(orderId, {
    action: "save_shipping",
    trackingNumber,
  });
}
