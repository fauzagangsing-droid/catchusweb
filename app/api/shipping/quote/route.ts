import { NextResponse, type NextRequest } from "next/server";
import { ApicoError, getShippingOptions } from "@/lib/apico";
import { createShippingQuoteToken } from "@/lib/shipping-quotes";
import {
  DEFAULT_PRODUCT_WEIGHT_KG,
  resolveProductWeightKg,
} from "@/lib/product-weight";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";

type CartWeightRow = {
  quantity: number;
  product: { weight: number | null; status: string } | null;
};

type AllowedCourierName = "JNE Express" | "J&T Express";

function compactCourierIdentity(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function allowedCourierName(
  courierCode: string,
  courierName: string
): AllowedCourierName | null {
  const code = compactCourierIdentity(courierCode);
  const name = compactCourierIdentity(courierName);
  const identity = `${code}${name}`;

  // Catchus intentionally offers express delivery from JNE and J&T only.
  // Cargo is rejected first because some cargo products reuse the parent
  // brand code (for example `jne`) and would otherwise pass the brand check.
  if (
    identity.includes("cargo") ||
    identity.includes("trucking") ||
    identity.includes("freight") ||
    code.includes("jtr")
  ) {
    return null;
  }

  const isJneCode = code === "jne" || code === "jneexpress";
  const isJntCode = new Set([
    "jnt",
    "jt",
    "jntexpress",
    "jtexpress",
    "jandt",
    "jandtexpress",
  ]).has(code);
  const isJneName =
    name.startsWith("jne") || name.includes("jalurnugrahaekakurir");
  const isJntName =
    name.startsWith("jnt") ||
    name.startsWith("jtexpress") ||
    name.startsWith("jandt");

  if (isJneCode || isJneName) return "JNE Express";
  if (isJntCode || isJntName) return "J&T Express";
  return null;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan ongkir tidak valid." }, { status: 403 });
  }
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });

  let addressId = "";
  try {
    const body = (await request.json()) as { addressId?: unknown };
    addressId = typeof body.addressId === "string" ? body.addressId : "";
  } catch {
    // Handled by the validation below.
  }
  if (!addressId) {
    return NextResponse.json({ error: "Pilih alamat pengiriman." }, { status: 400 });
  }

  const [{ data: address }, { data: cart }] = await Promise.all([
    supabase.from("shipping_addresses").select("id, village_code").eq("id", addressId).maybeSingle(),
    supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!address) return NextResponse.json({ error: "Alamat tidak ditemukan." }, { status: 404 });
  if (!cart) return NextResponse.json({ error: "Keranjang Anda kosong." }, { status: 400 });

  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("quantity, product:products(weight,status)")
    .eq("cart_id", cart.id);
  if (cartError || !cartRows?.length) {
    return NextResponse.json({ error: "Keranjang Anda kosong." }, { status: 400 });
  }

  const rows = cartRows as unknown as CartWeightRow[];
  if (rows.some((row) => !row.product || row.product.status !== "active")) {
    return NextResponse.json({ error: "Ada produk yang sudah tidak tersedia." }, { status: 400 });
  }
  const calculatedWeight = rows.reduce(
    (total, row) =>
      total + resolveProductWeightKg(row.product?.weight) * row.quantity,
    0
  );
  const weight = Number(
    Math.max(calculatedWeight, DEFAULT_PRODUCT_WEIGHT_KG).toFixed(3)
  );

  try {
    const couriers = await getShippingOptions(address.village_code, weight);
    const options = couriers.flatMap((courier) => {
      const courierName = allowedCourierName(
        courier.courierCode,
        courier.courierName
      );
      if (!courierName) return [];

      return [{
        ...courier,
        courierName,
        quoteToken: createShippingQuoteToken({
          userId: user.id,
          destinationVillageCode: address.village_code,
          weight,
          courierCode: courier.courierCode,
          courierName,
          shippingCost: courier.cost,
          estimation: courier.estimation,
        }),
      }];
    });
    if (options.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada layanan kurir untuk alamat ini." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      destinationVillageCode: address.village_code,
      weight,
      options,
    });
  } catch (error) {
    const apiError = error instanceof ApicoError ? error : null;
    const headers = apiError?.retryAfter ? { "Retry-After": apiError.retryAfter } : undefined;
    return NextResponse.json(
      { error: apiError?.message ?? "Ongkir tidak dapat dihitung." },
      { status: apiError?.status ?? 500, headers }
    );
  }
}
