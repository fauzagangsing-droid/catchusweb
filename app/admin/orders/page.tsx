"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import OrderShippingSection from "@/components/admin/OrderShippingSection";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { formatRupiah } from "@/lib/adapters";
import {
  getAdminOrders,
  runAdminOrderAction,
  saveAdminOrderShipping,
} from "@/lib/admin-orders";
import type {
  OrderStatus,
  OrderWithItems,
  PaymentStatus,
  ShippingStatus,
} from "@/types/database";
import type { AdminOrderAction } from "@/types/order";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types/order";
import styles from "./orders.module.css";

const ACTION_LABELS: Record<AdminOrderAction, string> = {
  approve_payment: "Setujui Pembayaran",
  reject_payment: "Tolak Pembayaran",
  mark_processing: "Tandai Sedang Diproses",
  mark_shipped: "Tandai Sedang Dikirim",
  mark_completed: "Tandai Selesai",
  cancel_order: "Batalkan Pesanan",
};

function getAvailableActions(order: OrderWithItems): AdminOrderAction[] {
  const actions: AdminOrderAction[] = [];
  if (
    order.payment_status === "waiting_verification" &&
    order.order_status === "waiting_verification"
  ) {
    actions.push("approve_payment", "reject_payment");
  }
  if (order.order_status === "paid") actions.push("mark_processing");
  if (order.order_status === "shipped") actions.push("mark_completed");
  if (!["completed", "cancelled"].includes(order.order_status)) {
    actions.push("cancel_order");
  }
  return actions;
}

function OrdersContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput), 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAdminOrders({ search, paymentStatus, orderStatus });
    setOrders(result.data);
    setError(result.error);
    setLoading(false);
  }, [orderStatus, paymentStatus, search]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function handleAction(order: OrderWithItems, action: AdminOrderAction) {
    setUpdatingId(order.id);
    setError(null);
    const result = await runAdminOrderAction(order.id, action);
    if (result.error) setError(result.error);
    await loadOrders();
    setUpdatingId(null);
  }

  async function handleShippingSave(
    order: OrderWithItems,
    trackingNumber: string,
    shippingStatus: ShippingStatus
  ) {
    setUpdatingId(order.id);
    setError(null);
    const result = await saveAdminOrderShipping(
      order.id,
      trackingNumber,
      shippingStatus
    );
    if (result.error) setError(result.error);
    await loadOrders();
    setUpdatingId(null);
  }

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={styles.main}>
        <Topbar title="Manajemen Pesanan" onOpenMobile={() => setMobileOpen(true)} />
        <div className={styles.content}>
          {error && <div className={styles.error} role="alert">{error}</div>}

          <section className={styles.filters}>
            <div className={styles.search}><i className="ri-search-line" aria-hidden="true" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari pesanan, pelanggan, atau email" /></div>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus | "all")} aria-label="Filter status pembayaran">
              <option value="all">Semua Status Pembayaran</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as OrderStatus | "all")} aria-label="Filter status pesanan">
              <option value="all">Semua Status Pesanan</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </section>

          {loading ? (
            <div className={styles.loading}>Memuat pesanan...</div>
          ) : orders.length === 0 ? (
            <div className={styles.empty}><i className="ri-inbox-2-line" aria-hidden="true" /><span>Tidak ada pesanan yang sesuai dengan filter.</span></div>
          ) : (
            <div className={styles.orders}>
              {orders.map((order) => {
                const actions = getAvailableActions(order);
                return (
                  <article className={styles.order} key={order.id}>
                    <div className={styles.orderHeader}>
                      <div><span>Pesanan</span><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleString("id-ID")}</small></div>
                      <div className={styles.badges}><span className={styles[order.payment_status]}>{PAYMENT_STATUS_LABELS[order.payment_status]}</span><span className={styles[order.order_status]}>{ORDER_STATUS_LABELS[order.order_status]}</span></div>
                    </div>

                    <div className={styles.overview}>
                      <div><span>Pelanggan</span><strong>{order.shipping_full_name}</strong><small>{order.customer_email}<br />{order.shipping_phone}</small></div>
                      <div><span>Pembayaran</span><strong>{PAYMENT_METHOD_LABELS[order.payment_method]}</strong><small>{PAYMENT_STATUS_LABELS[order.payment_status]}</small></div>
                      <div><span>Total</span><strong>{formatRupiah(order.total)}</strong><small>Pengiriman {formatRupiah(order.shipping_cost)}</small></div>
                      <div><span>Diperbarui</span><strong>{new Date(order.updated_at).toLocaleDateString("id-ID")}</strong><small>{new Date(order.updated_at).toLocaleTimeString("id-ID")}</small></div>
                    </div>

                    <details className={styles.details}>
                      <summary>Lihat detail pelanggan, produk, dan pengiriman</summary>
                      <div className={styles.detailGrid}>
                        <section><h3>Informasi Pengiriman</h3><strong>{order.shipping_full_name}</strong><p>{order.shipping_address}<br />{order.shipping_village && `${order.shipping_village}, `}{order.shipping_district && `${order.shipping_district}, `}{order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}</p><span>{order.shipping_phone}</span></section>
                        <section><h3>Produk yang Dipesan</h3><div className={styles.products}>{order.order_items.map((item) => <div className={styles.product} key={item.id}><div className={styles.productImage}><Image src={item.product_image_url ?? "/images/catchus.PNG"} alt={item.product_name} fill sizes="48px" /></div><div><strong>{item.product_name}</strong><span>{item.quantity} × {formatRupiah(item.unit_price)}</span></div><b>{formatRupiah(item.subtotal)}</b></div>)}</div></section>
                      </div>
                      <OrderShippingSection
                        order={order}
                        saving={updatingId === order.id}
                        onSave={(trackingNumber, shippingStatus) =>
                          handleShippingSave(order, trackingNumber, shippingStatus)
                        }
                      />
                    </details>

                    {actions.length > 0 && (
                      <div className={styles.actions}>
                        {actions.map((action) => (
                          <button type="button" key={action} onClick={() => handleAction(order, action)} disabled={Boolean(updatingId)} className={action === "reject_payment" || action === "cancel_order" ? styles.danger : ""}>
                            {updatingId === order.id ? "Memperbarui..." : ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return <RequireAdminAuth><OrdersContent /></RequireAdminAuth>;
}
