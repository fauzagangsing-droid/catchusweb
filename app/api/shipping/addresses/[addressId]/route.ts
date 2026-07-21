import { NextResponse, type NextRequest } from "next/server";
import { ApicoError } from "@/lib/apico";
import { normalizeShippingAddress } from "@/lib/shipping-addresses";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

interface AddressRouteContext {
  params: { addressId: string };
}

export async function PATCH(request: NextRequest, { params }: AddressRouteContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan alamat tidak valid." }, { status: 403 });
  }
  const supabase = createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });

  try {
    const normalized = await normalizeShippingAddress(await request.json(), user.id);
    const { user_id: _userId, ...updates } = normalized;
    const { data, error } = await supabase
      .from("shipping_addresses")
      .update(updates)
      .eq("id", params.addressId)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message);
    return NextResponse.json({ address: data });
  } catch (error) {
    const status = error instanceof ApicoError ? error.status : 400;
    const message = error instanceof ApicoError ? error.message : "Alamat tidak dapat diperbarui.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: AddressRouteContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan alamat tidak valid." }, { status: 403 });
  }
  const supabase = createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });

  const { error } = await supabase.from("shipping_addresses").delete().eq("id", params.addressId);
  if (error) {
    return NextResponse.json({ error: "Alamat tidak dapat dihapus." }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
