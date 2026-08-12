import { NextResponse, type NextRequest } from "next/server";
import { ApicoError, getRegions } from "@/lib/apico";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import type { RegionLevel } from "@/types/shipping";

const LEVELS: RegionLevel[] = ["province", "city", "district", "village"];

export async function GET(request: NextRequest) {
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
  }

  const level = request.nextUrl.searchParams.get("level") as RegionLevel | null;
  const parentCode = request.nextUrl.searchParams.get("parentCode")?.trim();
  if (!level || !LEVELS.includes(level)) {
    return NextResponse.json({ error: "Tingkat wilayah tidak valid." }, { status: 400 });
  }

  try {
    const regions = await getRegions(level, parentCode);
    return NextResponse.json(
      { regions },
      { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    const apiError = error instanceof ApicoError ? error : null;
    const headers = apiError?.retryAfter ? { "Retry-After": apiError.retryAfter } : undefined;
    return NextResponse.json(
      { error: apiError?.message ?? "Wilayah tidak dapat dimuat." },
      { status: apiError?.status ?? 500, headers }
    );
  }
}
