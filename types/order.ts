import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";

export type AdminOrderAction =
  | "approve_payment"
  | "reject_payment"
  | "mark_processing"
  | "mark_shipped"
  | "mark_completed"
  | "cancel_order";

export interface CheckoutFormValues {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
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
