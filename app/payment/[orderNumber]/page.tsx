import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PaymentConfirmationButton from "@/components/orders/PaymentConfirmationButton";
import QrisDownloadButton from "@/components/orders/QrisDownloadButton";
import { formatRupiah } from "@/lib/adapters";
import { getCustomerOrder } from "@/lib/orders";
import { getPaymentSettings } from "@/lib/payment-settings";
import { getWebsiteSettings } from "@/lib/queries";
import { createCustomerServerClient } from "@/lib/supabase/customer-server";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_STATUS_LABELS,
  getCourierName,
} from "@/types/order";
import styles from "./payment.module.css";

export const dynamic = "force-dynamic";

interface PaymentPageProps {
  params: { orderNumber: string };
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const supabase = createCustomerServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) {
    redirect(`/login?next=${encodeURIComponent(`/payment/${params.orderNumber}`)}`);
  }

  const [orderResult, paymentResult, settingsResult] = await Promise.all([
    getCustomerOrder(supabase, params.orderNumber),
    getPaymentSettings(supabase),
    getWebsiteSettings(),
  ]);
  if (!orderResult.data) notFound();

  const order = orderResult.data;
  const payment = paymentResult.data;
  const settings = settingsResult.data ?? DEFAULT_WEBSITE_SETTINGS;
  const canConfirmPayment =
    order.order_status === "pending_payment" &&
    (order.payment_status === "pending" || order.payment_status === "rejected");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>{settings.brand_name}</Link>
          <Link href="/account/orders" className={styles.ordersLink}>Pesanan Saya</Link>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        <div className={styles.title}>
          <span>Pembayaran manual</span>
          <h1>Selesaikan Pembayaran</h1>
          <p>Ikuti petunjuk pembayaran, lalu kirimkan pembayaran untuk diverifikasi.</p>
        </div>

        <div className={styles.layout}>
          <section className={styles.paymentCard}>
            <div className={styles.paymentHeader}>
              <div><span>Nomor Pesanan</span><strong>{order.order_number}</strong></div>
              <span className={`${styles.status} ${styles[order.payment_status]}`}>
                {PAYMENT_STATUS_LABELS[order.payment_status]}
              </span>
            </div>

            <div className={styles.amount}>
              <span>Total Pembayaran</span>
              <strong>{formatRupiah(order.total)}</strong>
            </div>

            <div className={styles.method}>
              <h2>{PAYMENT_METHOD_LABELS[order.payment_method]}</h2>
              {order.payment_method === "qris" ? (
                <div className={styles.qrisDetails}>
                  <strong>{payment?.qris_merchant_name ?? "Informasi tidak tersedia"}</strong>
                  {payment?.qris_image_url ? (
                    <>
                      <div className={styles.qrisImage}>
                        <Image src={payment.qris_image_url} alt={`QRIS ${payment.qris_merchant_name ?? "Catchus"}`} width={520} height={520} priority />
                      </div>
                      <QrisDownloadButton imageUrl={payment.qris_image_url} />
                    </>
                  ) : <p>Gambar QRIS tidak tersedia.</p>}
                  {payment?.qris_description && <p>{payment.qris_description}</p>}
                </div>
              ) : order.payment_method === "dana" ? (
                <dl>
                  <div><dt>Nomor DANA</dt><dd>{payment?.dana_number ?? "Tidak tersedia"}</dd></div>
                  <div><dt>Nama Akun</dt><dd>{payment?.dana_account_name ?? "Tidak tersedia"}</dd></div>
                </dl>
              ) : (
                <dl>
                  <div><dt>Nama Bank</dt><dd>{payment?.bank_name ?? "Tidak tersedia"}</dd></div>
                  <div><dt>Nomor Rekening</dt><dd>{payment?.bank_account_number ?? "Tidak tersedia"}</dd></div>
                  <div><dt>Nama Pemilik Rekening</dt><dd>{payment?.bank_account_holder ?? "Tidak tersedia"}</dd></div>
                </dl>
              )}
            </div>

            <div className={styles.instructions}>
              <h3>Petunjuk Pembayaran</h3>
              <ol>
                <li>Bayar tepat sebesar {formatRupiah(order.total)} melalui metode di atas.</li>
                <li>Simpan bukti pembayaran hingga pembayaran disetujui.</li>
                <li>Klik &ldquo;Saya Sudah Bayar&rdquo; setelah menyelesaikan pembayaran.</li>
              </ol>
            </div>

            {canConfirmPayment ? (
              <PaymentConfirmationButton orderNumber={order.order_number} />
            ) : (
              <div className={styles.notice} role="status">
                Status pembayaran: {PAYMENT_STATUS_LABELS[order.payment_status]}
              </div>
            )}
          </section>

          <aside className={styles.summary}>
            <h2>Ringkasan Pesanan</h2>
            <div className={styles.summaryRows}>
              <div><span>Metode Pembayaran</span><strong>{PAYMENT_METHOD_LABELS[order.payment_method]}</strong></div>
              <div><span>Status Pesanan</span><strong>{ORDER_STATUS_LABELS[order.order_status]}</strong></div>
              <div><span>Subtotal</span><strong>{formatRupiah(order.subtotal)}</strong></div>
              <div><span>Pengiriman</span><strong>{formatRupiah(order.shipping_cost)}</strong></div>
              <div className={styles.total}><span>Total</span><strong>{formatRupiah(order.total)}</strong></div>
            </div>
            <div className={styles.shipping}>
              <h3>Dikirim Kepada</h3>
              <strong>{order.shipping_full_name}</strong>
              <p>{order.shipping_address}, {order.shipping_village && `${order.shipping_village}, `}{order.shipping_district && `${order.shipping_district}, `}{order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}</p>
              <span>{order.shipping_phone}</span>
              {order.courier_code && (
                <p>{getCourierName(order)} · {formatRupiah(order.shipping_cost)} · {order.shipping_estimation ?? "Estimasi tidak tersedia"} · {SHIPPING_STATUS_LABELS[order.shipping_status]}</p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
