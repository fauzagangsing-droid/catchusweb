import { createRegionResponse } from "@/lib/region-route";

export const dynamic = "force-dynamic";

export async function GET() {
  return createRegionResponse("province");
}
