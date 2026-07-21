import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

const schema = z.object({
  code: z.string().trim().min(1).max(50),
  subtotal: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Permintaan voucher tidak valid." }, { status: 403 });
  const supabase = createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kode voucher tidak valid." }, { status: 400 });

  const { data: voucher } = await supabase.from("vouchers").select("*")
    .ilike("code", parsed.data.code).maybeSingle();
  const now = Date.now();
  if (!voucher || !voucher.is_active) return NextResponse.json({ error: "Voucher tidak aktif." }, { status: 404 });
  if (voucher.starts_at && new Date(voucher.starts_at).getTime() > now) return NextResponse.json({ error: "Voucher belum berlaku." }, { status: 400 });
  if (voucher.expires_at && new Date(voucher.expires_at).getTime() <= now) return NextResponse.json({ error: "Voucher sudah kedaluwarsa." }, { status: 400 });
  if (voucher.usage_limit != null && voucher.used_count >= voucher.usage_limit) return NextResponse.json({ error: "Batas penggunaan voucher telah tercapai." }, { status: 400 });
  if (parsed.data.subtotal < voucher.minimum_purchase) return NextResponse.json({ error: `Minimum pembelian voucher adalah Rp ${Math.round(voucher.minimum_purchase).toLocaleString("id-ID")}.` }, { status: 400 });

  let discount = voucher.type === "percentage" ? parsed.data.subtotal * voucher.value / 100 : voucher.value;
  if (voucher.maximum_discount != null) discount = Math.min(discount, voucher.maximum_discount);
  discount = Math.min(discount, parsed.data.subtotal);
  return NextResponse.json({ code: voucher.code, discount: Math.round(discount * 100) / 100 });
}
