import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingStatus,
} from "@/types/database";

export type AdminOrderAction =
  | "approve_payment"
  | "reject_payment"
  | "mark_processing"
  | "mark_shipped"
  | "mark_completed"
  | "cancel_order";

export interface CheckoutFormValues {
  addressId: string;
  shippingQuoteToken: string;
  paymentMethod: PaymentMethod;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  qris: "QRIS",
  dana: "DANA",
  bank_transfer: "Transfer Bank",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Sudah Dibayar",
  rejected: "Pembayaran Ditolak",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Sudah Dibayar",
  processing: "Sedang Diproses",
  shipped: "Sedang Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pending: "Menunggu Diproses",
  ready_to_ship: "Siap Dikirim",
  shipped: "Dalam Pengiriman",
  delivered: "Terkirim",
  returned: "Dikembalikan",
  cancelled: "Pengiriman Dibatalkan",
};

export function getCourierName(order: {
  courier_name: string | null;
  courier_code: string | null;
  shipping_courier: string | null;
}): string {
  return order.courier_name ?? order.courier_code ?? order.shipping_courier ?? "-";
}
