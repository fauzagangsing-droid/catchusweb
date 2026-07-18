import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderWithItems } from "@/types/database";

export function friendlyOrderError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("authentication required") || normalized.includes("silakan masuk")) {
    return "Sesi Anda telah berakhir. Silakan masuk kembali.";
  }
  if (normalized.includes("cart is empty")) {
    return "Keranjang Anda kosong.";
  }
  if (normalized.includes("no longer available")) {
    return "Produk di keranjang Anda sudah tidak tersedia.";
  }
  if (normalized.includes("exceeds available stock")) {
    return "Jumlah produk melebihi stok yang tersedia. Periksa keranjang lalu coba lagi.";
  }
  if (normalized.includes("payment method is not configured")) {
    return "Metode pembayaran yang dipilih sedang tidak tersedia.";
  }
  if (normalized.includes("shipping information")) {
    return "Lengkapi seluruh informasi pengiriman sebelum membuat pesanan.";
  }
  if (normalized.includes("status transition")) {
    return "Tindakan tersebut tidak sesuai dengan status pesanan saat ini.";
  }
  if (normalized.includes("kurir") || normalized.includes("nomor resi")) {
    return "Kurir dan nomor resi wajib diisi sebelum pesanan dikirim.";
  }
  if (normalized.includes("informasi pengiriman")) {
    return "Informasi pengiriman hanya dapat disimpan saat pesanan sedang diproses.";
  }

  return "Pesanan tidak dapat diproses. Silakan coba lagi.";
}

export async function getCustomerOrders(
  client: SupabaseClient<Database>
): Promise<{ data: OrderWithItems[]; error: string | null }> {
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as OrderWithItems[], error: null };
}

export async function getCustomerOrder(
  client: SupabaseClient<Database>,
  orderNumber: string
): Promise<{ data: OrderWithItems | null; error: string | null }> {
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as OrderWithItems | null, error: null };
}
