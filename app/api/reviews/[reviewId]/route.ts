import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(3).max(2000),
  images: z.array(z.string().url()).max(5).optional().default([]),
});
interface ReviewContext { params: { reviewId: string } }

async function authenticatedUser() {
  const client = createCustomerServerClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function PATCH(request: NextRequest, { params }: ReviewContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review tidak valid." }, { status: 400 });
  const service = createServiceRoleClient();
  const { data, error } = await service.from("product_reviews").update(parsed.data)
    .eq("id", params.reviewId).eq("user_id", user.id).select("*").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Review tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ review: data });
}

export async function DELETE(request: NextRequest, { params }: ReviewContext) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
  const service = createServiceRoleClient();
  const { data, error } = await service.from("product_reviews").delete()
    .eq("id", params.reviewId).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Review tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ success: true });
}
