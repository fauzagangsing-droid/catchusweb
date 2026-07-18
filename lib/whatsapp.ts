import type { Order, ShippingCourier } from "@/types/database";
import { SHIPPING_COURIER_LABELS } from "@/types/order";

export function normalizeWhatsAppPhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function createShippingWhatsAppMessage({
  customerName,
  orderNumber,
  courier,
  trackingNumber,
}: {
  customerName: string;
  orderNumber: string;
  courier: ShippingCourier;
  trackingNumber: string;
}): string {
  return [
    `Halo ${customerName} 👋`,
    "",
    "Pesanan Anda dari Catchus telah dikirim.",
    "",
    "📦 Order:",
    orderNumber,
    "",
    "🚚 Kurir:",
    SHIPPING_COURIER_LABELS[courier],
    "",
    "📮 Nomor Resi:",
    trackingNumber,
    "",
    "Silakan lakukan pelacakan melalui website resmi kurir.",
    "",
    "Terima kasih telah berbelanja di Catchus ❤️",
  ].join("\n");
}

export function createShippingWhatsAppUrl(
  order: Pick<
    Order,
    | "shipping_full_name"
    | "shipping_phone"
    | "order_number"
    | "shipping_courier"
    | "tracking_number"
  >
): string | null {
  const phone = normalizeWhatsAppPhone(order.shipping_phone);
  if (!phone || !order.shipping_courier || !order.tracking_number) return null;

  const message = createShippingWhatsAppMessage({
    customerName: order.shipping_full_name,
    orderNumber: order.order_number,
    courier: order.shipping_courier,
    trackingNumber: order.tracking_number,
  });

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
