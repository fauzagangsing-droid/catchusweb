import type { NextRequest } from "next/server";
import { createRegionResponse } from "@/lib/region-route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return createRegionResponse(
    "village",
    request.nextUrl.searchParams.get("district_code") ?? undefined
  );
}
