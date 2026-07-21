import type { ShippingAddress } from "@/types/database";

export type RegionLevel = "province" | "city" | "district" | "village";

export interface RegionOption {
  code: string;
  name: string;
  postalCodes: string[];
  isCourierSupported: boolean | null;
}

export interface ShippingOption {
  courierCode: string;
  courierName: string;
  cost: number;
  estimation: string | null;
  weight: number;
  quoteToken: string;
}

export interface ShippingQuoteResponse {
  destinationVillageCode: string;
  weight: number;
  options: ShippingOption[];
}

export type ShippingAddressInput = Pick<
  ShippingAddress,
  | "recipient_name"
  | "phone"
  | "postal_code"
  | "full_address"
  | "label"
  | "is_default"
> & {
  village_code: string;
};
