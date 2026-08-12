import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const schema = z.object({
  code: z.string().trim().min(1).max(50),
  // Accepted for backward compatibility with the current checkout client,
  // but never trusted for validation or discount calculation.
  subtotal: z.number().nonnegative().optional(),
});

type VoucherCartRow = {
  quantity: number;
  product: { price: number; status: string } | null;
};

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Permintaan voucher tidak valid." }, { status: 403 });
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kode voucher tidak valid." }, { status: 400 });

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cart) {
    return NextResponse.json({ error: "Keranjang Anda kosong." }, { status: 400 });
  }

  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("quantity, product:products(price,status)")
    .eq("cart_id", cart.id);
  const rows = (cartRows ?? []) as unknown as VoucherCartRow[];
  if (
    cartError ||
    rows.length === 0 ||
    rows.some((row) => !row.product || row.product.status !== "active")
  ) {
    return NextResponse.json(
      { error: "Keranjang berubah. Muat ulang halaman checkout." },
      { status: 400 }
    );
  }
  const subtotal = rows.reduce(
    (total, row) => total + (row.product?.price ?? 0) * row.quantity,
    0
  );

  const service = createServiceRoleClient();
  const { data: voucher } = await service.from("vouchers").select("*")
    .ilike("code", parsed.data.code).maybeSingle();
  const now = Date.now();
  if (!voucher || !voucher.is_active) return NextResponse.json({ error: "Voucher tidak aktif." }, { status: 404 });
  if (voucher.starts_at && new Date(voucher.starts_at).getTime() > now) return NextResponse.json({ error: "Voucher belum berlaku." }, { status: 400 });
  if (voucher.expires_at && new Date(voucher.expires_at).getTime() <= now) return NextResponse.json({ error: "Voucher sudah kedaluwarsa." }, { status: 400 });
  if (voucher.usage_limit != null && voucher.used_count >= voucher.usage_limit) return NextResponse.json({ error: "Batas penggunaan voucher telah tercapai." }, { status: 400 });
  if (subtotal < voucher.minimum_purchase) return NextResponse.json({ error: `Minimum pembelian voucher adalah Rp ${Math.round(voucher.minimum_purchase).toLocaleString("id-ID")}.` }, { status: 400 });

  let discount = voucher.type === "percentage" ? subtotal * voucher.value / 100 : voucher.value;
  if (voucher.maximum_discount != null) discount = Math.min(discount, voucher.maximum_discount);
  discount = Math.min(discount, subtotal);
  return NextResponse.json({ code: voucher.code, discount: Math.round(discount * 100) / 100 });
}
