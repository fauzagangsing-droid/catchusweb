import Image from "next/image";
import Link from "next/link";
import { formatRupiah } from "@/lib/adapters";
import type { OrderWithItems } from "@/types/database";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types/order";
import styles from "./CustomerOrders.module.css";

interface CustomerOrdersProps {
  orders: OrderWithItems[];
  error: string | null;
}

export default function CustomerOrders({ orders, error }: CustomerOrdersProps) {
  return (
    <main className={`container ${styles.main}`}>
      <div className={styles.header}>
        <div><span>Riwayat pesanan</span><h1>Pesanan Saya</h1><p>Pantau status pembayaran dan pengiriman setiap pesanan.</p></div>
        <Link href="/account">Kembali ke Akun</Link>
      </div>

      {error && <div className={styles.error} role="alert">Riwayat pesanan tidak dapat dimuat.</div>}

      {orders.length === 0 ? (
        <section className={styles.empty}>
          <i className="ri-file-list-3-line" aria-hidden="true" />
          <h2>Belum ada pesanan</h2>
          <p>Pesanan yang telah dibuat akan muncul di sini.</p>
          <Link href="/#produk">Lanjut Belanja</Link>
        </section>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <article className={styles.order} key={order.id}>
              <div className={styles.orderHeader}>
                <div><span>Nomor Pesanan</span><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleString("id-ID")}</small></div>
                <div className={styles.badges}>
                  <span className={styles[order.payment_status]}>{PAYMENT_STATUS_LABELS[order.payment_status]}</span>
                  <span className={styles[order.order_status]}>{ORDER_STATUS_LABELS[order.order_status]}</span>
                </div>
              </div>

              <div className={styles.products}>
                {order.order_items.map((item) => (
                  <div className={styles.product} key={item.id}>
                    <div className={styles.image}>
                      <Image src={item.product_image_url ?? "/images/catchus.PNG"} alt={item.product_name} fill sizes="64px" />
                    </div>
                    <div><strong>{item.product_name}</strong><span>{item.quantity} × {formatRupiah(item.unit_price)}</span></div>
                    <b>{formatRupiah(item.subtotal)}</b>
                  </div>
                ))}
              </div>

              <div className={styles.details}>
                <div><span>Pembayaran</span><strong>{PAYMENT_METHOD_LABELS[order.payment_method]}</strong></div>
                <div><span>Dikirim ke</span><strong>{order.shipping_city}, {order.shipping_province}</strong></div>
                <div><span>Total</span><strong>{formatRupiah(order.total)}</strong></div>
                {order.order_status === "pending_payment" && (
                  <Link href={`/payment/${order.order_number}`}>Lanjutkan Pembayaran</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
