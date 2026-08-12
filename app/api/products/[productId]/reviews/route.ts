import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(3).max(2000),
  images: z.array(z.string().url()).max(5).optional().default([]),
});

interface ReviewRouteContext { params: Promise<{ productId: string }> }
const productIdSchema = z.string().uuid();

export async function GET(request: NextRequest, { params }: ReviewRouteContext) {
  const { productId } = await params;
  if (!productIdSchema.safeParse(productId).success) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }
  const sort = request.nextUrl.searchParams.get("sort") ?? "newest";
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const service = createServiceRoleClient();
  const { data: product } = await service
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  let query = service
    .from("product_reviews")
    .select("id, product_id, user_id, rating, review, images, created_at, updated_at")
    .eq("product_id", productId);
  if (sort === "highest") query = query.order("rating", { ascending: false }).order("created_at", { ascending: false });
  else if (sort === "lowest") query = query.order("rating", { ascending: true }).order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const { data: reviews, error } = await query;
  if (error) return NextResponse.json({ error: "Review tidak dapat dimuat." }, { status: 500 });

  let eligibleOrderId: string | null = null;
  if (user) {
    const { data: purchasedItems } = await service
      .from("order_items")
      .select("order_id, orders!inner(user_id,payment_status,created_at)")
      .eq("product_id", productId)
      .eq("orders.user_id", user.id)
      .eq("orders.payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(1);
    eligibleOrderId = purchasedItems?.[0]?.order_id ?? null;
  }

  const reviewRows = reviews ?? [];
  const averageRating = reviewRows.length
    ? reviewRows.reduce((total, review) => total + review.rating, 0) / reviewRows.length
    : 0;
  return NextResponse.json({
    averageRating: Number(averageRating.toFixed(1)),
    reviewCount: reviewRows.length,
    canReview: Boolean(user && eligibleOrderId && !reviewRows.some((review) => review.user_id === user.id)),
    reviews: reviewRows.map((review) => ({
      id: review.id,
      product_id: review.product_id,
      rating: review.rating,
      review: review.review,
      images: review.images,
      created_at: review.created_at,
      updated_at: review.updated_at,
      reviewerName: "Verified Buyer",
      isOwn: review.user_id === user?.id,
    })),
  });
}

export async function POST(request: NextRequest, { params }: ReviewRouteContext) {
  const { productId } = await params;
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Permintaan review tidak valid." }, { status: 403 });
  }
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk untuk memberi review." }, { status: 401 });
  if (!productIdSchema.safeParse(productId).success) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Review tidak valid." }, { status: 400 });

  const service = createServiceRoleClient();
  const { data: purchasedItems } = await service
    .from("order_items")
    .select("order_id, orders!inner(user_id,payment_status,created_at)")
    .eq("product_id", productId)
    .eq("orders.user_id", user.id)
    .eq("orders.payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(1);
  const orderId = purchasedItems?.[0]?.order_id;
  if (!orderId) return NextResponse.json({ error: "Hanya pembeli terverifikasi yang dapat memberi review." }, { status: 403 });

  const { data: review, error } = await service.from("product_reviews").insert({
    product_id: productId,
    user_id: user.id,
    order_id: orderId,
    ...parsed.data,
  }).select("*").single();
  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json({ error: duplicate ? "Produk ini sudah pernah Anda review." : "Review tidak dapat disimpan." }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ review }, { status: 201 });
}
