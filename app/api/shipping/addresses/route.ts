import { NextResponse, type NextRequest } from "next/server";
import { ApicoError } from "@/lib/apico";
import { normalizeShippingAddress } from "@/lib/shipping-addresses";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

export async function GET() {
  const supabase = createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });

  const { data, error } = await supabase
    .from("shipping_addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "Alamat tidak dapat dimuat." }, { status: 500 });
  }
  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan alamat tidak valid." }, { status: 403 });
  }
  const supabase = createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });

  try {
    const address = await normalizeShippingAddress(await request.json(), user.id);
    const { data, error } = await supabase
      .from("shipping_addresses")
      .insert(address)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message);
    return NextResponse.json({ address: data }, { status: 201 });
  } catch (error) {
    const status = error instanceof ApicoError ? error.status : 400;
    const message = error instanceof ApicoError ? error.message : "Alamat tidak dapat disimpan.";
    return NextResponse.json({ error: message }, { status });
  }
}
