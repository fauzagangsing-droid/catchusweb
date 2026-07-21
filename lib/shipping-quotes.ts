import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export interface ShippingQuotePayload {
  userId: string;
  destinationVillageCode: string;
  weight: number;
  courierCode: string;
  courierName: string;
  shippingCost: number;
  estimation: string | null;
  expiresAt: number;
}

const QUOTE_TTL_MS = 10 * 60 * 1000;

function signingKey(): string {
  const apiKey = process.env.APICO_API_KEY?.trim();
  if (!apiKey) throw new Error("APICO_API_KEY is not configured.");
  return `catchus-shipping-quote:${apiKey}`;
}

function signature(encodedPayload: string): Buffer {
  return createHmac("sha256", signingKey()).update(encodedPayload).digest();
}

export function createShippingQuoteToken(
  payload: Omit<ShippingQuotePayload, "expiresAt">
): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, expiresAt: Date.now() + QUOTE_TTL_MS }),
    "utf8"
  ).toString("base64url");
  return `${encodedPayload}.${signature(encodedPayload).toString("base64url")}`;
}

export function verifyShippingQuoteToken(token: string): ShippingQuotePayload | null {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }
  const expectedSignature = signature(encodedPayload);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<ShippingQuotePayload>;
    if (
      typeof payload.userId !== "string" ||
      !/^\d{10}$/.test(payload.destinationVillageCode ?? "") ||
      typeof payload.weight !== "number" ||
      payload.weight <= 0 ||
      typeof payload.courierCode !== "string" ||
      typeof payload.courierName !== "string" ||
      typeof payload.shippingCost !== "number" ||
      payload.shippingCost < 0 ||
      (payload.estimation !== null && typeof payload.estimation !== "string") ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload as ShippingQuotePayload;
  } catch {
    return null;
  }
}
