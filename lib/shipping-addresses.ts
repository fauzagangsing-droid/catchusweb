import "server-only";

import { ApicoError, getVillage } from "@/lib/apico";
import type {
  ShippingAddressInsert,
  ShippingAddressLabel,
} from "@/types/database";

type AddressBody = Record<string, unknown>;

function requiredString(body: AddressBody, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function normalizeShippingAddress(
  body: unknown,
  userId: string
): Promise<ShippingAddressInsert> {
  if (typeof body !== "object" || body === null) {
    throw new ApicoError("Data alamat tidak valid.", 400);
  }
  const payload = body as AddressBody;
  const recipientName = requiredString(payload, "recipient_name");
  const phone = requiredString(payload, "phone");
  const postalCode = requiredString(payload, "postal_code");
  const fullAddress = requiredString(payload, "full_address");
  const villageCode = requiredString(payload, "village_code");
  const label = requiredString(payload, "label") as ShippingAddressLabel;

  if (recipientName.length < 2) {
    throw new ApicoError("Nama penerima wajib diisi.", 400);
  }
  if (!/^[0-9+()\-\s]{8,20}$/.test(phone)) {
    throw new ApicoError("Nomor telepon tidak valid.", 400);
  }
  if (fullAddress.length < 8) {
    throw new ApicoError("Alamat lengkap wajib diisi.", 400);
  }
  if (!/^\d{4,10}$/.test(postalCode)) {
    throw new ApicoError("Kode pos tidak valid.", 400);
  }
  if (!(["home", "office", "other"] as string[]).includes(label)) {
    throw new ApicoError("Label alamat tidak valid.", 400);
  }

  const village = await getVillage(villageCode);
  if (village.isCourierSupported === false) {
    throw new ApicoError("Kelurahan ini belum didukung oleh layanan kurir.", 400);
  }

  return {
    user_id: userId,
    recipient_name: recipientName,
    phone,
    postal_code: postalCode,
    full_address: fullAddress,
    label,
    province_code: village.provinceCode,
    province_name: village.provinceName,
    city_code: village.cityCode,
    city_name: village.cityName,
    district_code: village.districtCode,
    district_name: village.districtName,
    village_code: village.code,
    village_name: village.name,
    is_default: payload.is_default === true,
  };
}
