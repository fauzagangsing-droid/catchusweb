import "server-only";

import { NextResponse } from "next/server";
import { ApicoError, getRegions } from "@/lib/apico";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import type { RegionLevel } from "@/types/shipping";

const CODE_PATTERNS: Partial<Record<RegionLevel, RegExp>> = {
  city: /^\d{2}$/,
  district: /^\d{4}$/,
  village: /^\d{6,7}$/,
};

export function invalidRegionParameter(message: string) {
  return NextResponse.json(
    { success: false, data: [], regions: [], error: message },
    { status: 400 }
  );
}

export async function createRegionResponse(
  level: RegionLevel,
  parentCode?: string
) {
  const supabase = await createCustomerServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, data: [], regions: [], error: "Silakan masuk kembali." },
      { status: 401 }
    );
  }

  const normalizedParentCode = parentCode?.trim();
  const pattern = CODE_PATTERNS[level];
  if (pattern && (!normalizedParentCode || !pattern.test(normalizedParentCode))) {
    return invalidRegionParameter("Kode wilayah induk tidak valid.");
  }

  try {
    const regions = await getRegions(level, normalizedParentCode);
    return NextResponse.json(
      { success: true, data: regions, regions },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    const apiError = error instanceof ApicoError ? error : null;
    const headers = apiError?.retryAfter
      ? { "Retry-After": apiError.retryAfter }
      : undefined;
    return NextResponse.json(
      {
        success: false,
        data: [],
        regions: [],
        error: apiError?.message ?? "Wilayah tidak dapat dimuat.",
      },
      { status: apiError?.status ?? 500, headers }
    );
  }
}
