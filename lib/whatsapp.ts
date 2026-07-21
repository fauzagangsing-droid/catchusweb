import type { Order } from "@/types/database";
import { getCourierName } from "@/types/order";

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
  courierName,
  trackingNumber,
}: {
  customerName: string;
  orderNumber: string;
  courierName: string;
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
    courierName,
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
    | "courier_code"
    | "courier_name"
    | "tracking_number"
    | "shipping_status"
  >
): string | null {
  const phone = normalizeWhatsAppPhone(order.shipping_phone);
  if (
    !phone ||
    !order.shipping_courier ||
    !order.tracking_number ||
    !["shipped", "delivered"].includes(order.shipping_status)
  ) return null;

  const message = createShippingWhatsAppMessage({
    customerName: order.shipping_full_name,
    orderNumber: order.order_number,
    courierName: getCourierName(order),
    trackingNumber: order.tracking_number,
  });

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
