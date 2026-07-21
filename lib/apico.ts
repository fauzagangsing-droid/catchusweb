import "server-only";

import type { RegionLevel, RegionOption } from "@/types/shipping";

const APICO_BASE_URL = "https://use.api.co.id";
const REQUEST_TIMEOUT_MS = 12_000;

type ApicoEnvelope<T> = {
  is_success?: boolean;
  message?: string;
  data?: T;
  paging?: { page?: number; total_page?: number };
};

type ApicoRegion = {
  code?: unknown;
  name?: unknown;
  province_code?: unknown;
  province?: unknown;
  regency_code?: unknown;
  regency?: unknown;
  district_code?: unknown;
  district?: unknown;
  postal_codes?: unknown;
  is_courier_support?: unknown;
};

type ApicoCourier = {
  courier_code?: unknown;
  courier_name?: unknown;
  price?: unknown;
  weight?: unknown;
  estimation?: unknown;
};

export interface ResolvedVillage {
  code: string;
  name: string;
  districtCode: string;
  districtName: string;
  cityCode: string;
  cityName: string;
  provinceCode: string;
  provinceName: string;
  postalCodes: string[];
  isCourierSupported: boolean | null;
}

export interface ApicoShippingOption {
  courierCode: string;
  courierName: string;
  cost: number;
  estimation: string | null;
  weight: number;
}

export class ApicoError extends Error {
  status: number;
  retryAfter: string | null;

  constructor(message: string, status = 502, retryAfter: string | null = null) {
    super(message);
    this.name = "ApicoError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function getApiKey(): string {
  const apiKey = process.env.APICO_API_KEY?.trim();
  if (!apiKey) {
    throw new ApicoError("Layanan wilayah dan pengiriman belum dikonfigurasi.", 503);
  }
  return apiKey;
}

export function getOriginVillageCode(): string {
  const code = process.env.APICO_ORIGIN_VILLAGE_CODE?.trim() ?? "";
  if (!/^\d{10}$/.test(code)) {
    throw new ApicoError("Kode kelurahan asal pengiriman belum dikonfigurasi.", 503);
  }
  return code;
}

async function requestApico<T>(
  path: string,
  params: Record<string, string> = {},
  revalidate = 86_400
): Promise<ApicoEnvelope<T>> {
  const url = new URL(path, APICO_BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-api-co-id": getApiKey(), Accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApicoError("Layanan API.co.id tidak dapat dijangkau. Silakan coba lagi.", 503);
  }

  let payload: ApicoEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApicoEnvelope<T>;
  } catch {
    // A non-JSON upstream response is handled as a generic gateway failure below.
  }

  if (!response.ok || payload?.is_success === false) {
    const upstreamMessage = payload?.message?.toLowerCase() ?? "";
    let message = "Data API.co.id tidak dapat dimuat. Silakan coba lagi.";
    if (response.status === 401 || response.status === 402) {
      message = "Layanan API.co.id belum aktif atau kredensialnya tidak valid.";
    } else if (response.status === 429) {
      message = "Batas permintaan API.co.id tercapai. Silakan tunggu dan coba lagi.";
    } else if (response.status === 404) {
      message = "Wilayah yang dipilih tidak ditemukan.";
    } else if (upstreamMessage.includes("not supported")) {
      message = "Kelurahan ini belum didukung oleh layanan kurir.";
    } else if (response.status >= 400 && response.status < 500) {
      message = "Data pengiriman tidak valid. Silakan pilih ulang alamat.";
    }
    throw new ApicoError(message, response.status, response.headers.get("retry-after"));
  }

  if (!payload || payload.data === undefined) {
    throw new ApicoError("Respons API.co.id tidak lengkap.");
  }
  return payload;
}

function normalizePostalCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeRegion(region: ApicoRegion): RegionOption | null {
  if (typeof region.code !== "string" || typeof region.name !== "string") return null;
  return {
    code: region.code,
    name: region.name,
    postalCodes: normalizePostalCodes(region.postal_codes),
    isCourierSupported:
      typeof region.is_courier_support === "boolean"
        ? region.is_courier_support
        : null,
  };
}

const REGION_PATHS: Record<RegionLevel, (parentCode?: string) => string> = {
  province: () => "/regional/indonesia/provinces",
  city: (parentCode) => `/regional/indonesia/provinces/${parentCode}/regencies`,
  district: (parentCode) => `/regional/indonesia/regencies/${parentCode}/districts`,
  village: (parentCode) => `/regional/indonesia/districts/${parentCode}/villages`,
};

export async function getRegions(
  level: RegionLevel,
  parentCode?: string
): Promise<RegionOption[]> {
  if (level !== "province" && !parentCode) {
    throw new ApicoError("Wilayah induk wajib dipilih.", 400);
  }

  const payload = await requestApico<ApicoRegion[]>(REGION_PATHS[level](parentCode));
  return (Array.isArray(payload.data) ? payload.data : [])
    .map(normalizeRegion)
    .filter((region): region is RegionOption => region !== null);
}

export async function getVillage(villageCode: string): Promise<ResolvedVillage> {
  if (!/^\d{10}$/.test(villageCode)) {
    throw new ApicoError("Kode kelurahan tidak valid.", 400);
  }
  const payload = await requestApico<ApicoRegion>(
    `/regional/indonesia/villages/${villageCode}`
  );
  const village = payload.data;
  if (
    !village ||
    typeof village.code !== "string" ||
    typeof village.name !== "string" ||
    typeof village.district_code !== "string" ||
    typeof village.district !== "string" ||
    typeof village.regency_code !== "string" ||
    typeof village.regency !== "string" ||
    typeof village.province_code !== "string" ||
    typeof village.province !== "string"
  ) {
    throw new ApicoError("Data kelurahan dari API.co.id tidak lengkap.");
  }
  return {
    code: village.code,
    name: village.name,
    districtCode: village.district_code,
    districtName: village.district,
    cityCode: village.regency_code,
    cityName: village.regency,
    provinceCode: village.province_code,
    provinceName: village.province,
    postalCodes: normalizePostalCodes(village.postal_codes),
    isCourierSupported:
      typeof village.is_courier_support === "boolean"
        ? village.is_courier_support
        : null,
  };
}

export async function getShippingOptions(
  destinationVillageCode: string,
  weight: number
): Promise<ApicoShippingOption[]> {
  const originVillageCode = getOriginVillageCode();
  const payload = await requestApico<{
    couriers?: ApicoCourier[];
  }>(
    "/expedition/shipping-cost",
    {
      origin_village_code: originVillageCode,
      destination_village_code: destinationVillageCode,
      weight: String(weight),
    },
    60
  );

  const couriers = Array.isArray(payload.data?.couriers) ? payload.data.couriers : [];
  return couriers.flatMap((courier) => {
    const cost = Number(courier.price);
    const quotedWeight = Number(courier.weight);
    if (
      typeof courier.courier_code !== "string" ||
      typeof courier.courier_name !== "string" ||
      !Number.isFinite(cost) ||
      cost <= 0
    ) {
      return [];
    }
    return [
      {
        courierCode: courier.courier_code,
        courierName: courier.courier_name,
        cost,
        estimation:
          typeof courier.estimation === "string" && courier.estimation.trim()
            ? courier.estimation
            : null,
        weight: Number.isFinite(quotedWeight) && quotedWeight > 0 ? quotedWeight : weight,
      },
    ];
  });
}
