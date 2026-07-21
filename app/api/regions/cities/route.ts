import type { NextRequest } from "next/server";
import { createRegionResponse } from "@/lib/region-route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return createRegionResponse(
    "city",
    request.nextUrl.searchParams.get("province_code") ?? undefined
  );
}
