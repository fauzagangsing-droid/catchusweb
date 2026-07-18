"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCart } from "@/hooks/useCart";
import { formatRupiah } from "@/lib/adapters";
import { calculateCartTotals, getCart } from "@/lib/cart";
import {
  isBankTransferConfigured,
  isDanaConfigured,
  isQrisConfigured,
} from "@/lib/payment-settings";
import type {
  CartItemWithProduct,
  PaymentMethod,
  PaymentSettings,
  ShippingCourier,
} from "@/types/database";
import {
  SHIPPING_COURIER_LABELS,
  type CheckoutFormValues,
} from "@/types/order";
import styles from "./Checkout.module.css";

interface CheckoutClientProps {
  brandName: string;
  email: string;
  initialFullName: string;
  paymentSettings: PaymentSettings | null;
}

type CheckoutFormState = Omit<CheckoutFormValues, "courier"> & {
  courier: ShippingCourier | "";
};
type CheckoutField = Exclude<
  keyof CheckoutFormState,
  "courier" | "paymentMethod"
>;
type FieldErrors = Partial<Record<keyof CheckoutFormState, string>>;

function getProductImage(item: CartItemWithProduct): string {
  const images = item.product?.product_images ?? [];
  return (
    images.find((image) => image.is_thumbnail)?.image_url ??
    images[0]?.image_url ??
    "/images/catchus.PNG"
  );
}

function validate(values: CheckoutFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Masukkan nama penerima.";
  if (!/^[0-9+()\-\s]{8,20}$/.test(values.phone.trim())) errors.phone = "Masukkan nomor telepon yang valid.";
  if (values.address.trim().length < 8) errors.address = "Masukkan alamat lengkap.";
  if (values.city.trim().length < 2) errors.city = "Masukkan kota atau kabupaten.";
  if (values.province.trim().length < 2) errors.province = "Masukkan provinsi.";
  if (!/^\d{4,10}$/.test(values.postalCode.trim())) errors.postalCode = "Masukkan kode pos yang valid.";
  if (!values.courier) errors.courier = "Pilih kurir pengiriman.";
  if (!values.paymentMethod) errors.paymentMethod = "Pilih metode pembayaran.";
  return errors;
}

export default function CheckoutClient({
  brandName,
  email,
  initialFullName,
  paymentSettings,
}: CheckoutClientProps) {
  const router = useRouter();
  const { refreshCart } = useCart();
  const qrisConfigured = paymentSettings ? isQrisConfigured(paymentSettings) : false;
  const danaConfigured = paymentSettings ? isDanaConfigured(paymentSettings) : false;
  const bankConfigured = paymentSettings
    ? isBankTransferConfigured(paymentSettings)
    : false;
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [values, setValues] = useState<CheckoutFormState>({
    fullName: initialFullName,
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    courier: "",
    paymentMethod: qrisConfigured
      ? "qris"
      : danaConfigured
        ? "dana"
        : "bank_transfer",
  });

  useEffect(() => {
    let active = true;
    getCart()
      .then((cart) => {
        if (!active) return;
        setItems(cart?.items ?? []);
      })
      .catch(() => {
        if (active) setError("Keranjang tidak dapat dimuat. Silakan coba lagi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => calculateCartTotals(items), [items]);
  const shippingCost = paymentSettings?.shipping_cost ?? 0;
  const total = totals.subtotal + shippingCost;
  const hasUnavailableItems = items.some(
    (item) => !item.product || item.product.stock < item.quantity
  );

  function setField(field: CheckoutField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function selectPaymentMethod(paymentMethod: PaymentMethod) {
    setValues((current) => ({ ...current, paymentMethod }));
    setErrors((current) => ({ ...current, paymentMethod: undefined }));
  }

  function selectCourier(courier: ShippingCourier | "") {
    setValues((current) => ({ ...current, courier }));
    setErrors((current) => ({ ...current, courier: undefined }));
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (hasUnavailableItems || items.length === 0) {
      setError("Periksa keranjang Anda sebelum membuat pesanan.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as {
        orderNumber?: string;
        error?: string;
      };
      if (!response.ok || !result.orderNumber) {
        setError(result.error ?? "Pesanan tidak dapat dibuat.");
        setSubmitting(false);
        return;
      }

      await refreshCart();
      router.replace(`/payment/${encodeURIComponent(result.orderNumber)}`);
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi Anda lalu coba lagi.");
      setSubmitting(false);
    }
  }

  const field = (
    name: CheckoutField,
    label: string,
    autoComplete: string,
    inputMode?: "text" | "tel" | "numeric"
  ) => (
    <div className={styles.field}>
      <label htmlFor={`checkout-${name}`}>{label}</label>
      <input
        id={`checkout-${name}`}
        value={values[name]}
        onChange={(event) => setField(name, event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={submitting}
        aria-invalid={Boolean(errors[name])}
      />
      {errors[name] && <span>{errors[name]}</span>}
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>{brandName}</Link>
          <Link href="/cart" className={styles.backLink}>
            <i className="ri-arrow-left-line" aria-hidden="true" /> Kembali ke Keranjang
          </Link>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        <div className={styles.title}>
          <span>Proses pembayaran aman</span>
          <h1>Selesaikan Pesanan</h1>
          <p>Konfirmasi informasi pengiriman dan metode pembayaran Anda.</p>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        {loading ? (
          <div className={styles.loading}>Memuat checkout...</div>
        ) : items.length === 0 ? (
          <section className={styles.empty}>
            <h2>Keranjang Anda kosong</h2>
            <Link href="/#produk">Lanjut Belanja</Link>
          </section>
        ) : (
          <form className={styles.layout} onSubmit={placeOrder} noValidate>
            <div className={styles.formColumn}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="ri-map-pin-line" aria-hidden="true" />
                  <div><h2>Informasi Pengiriman</h2><p>Ke mana pesanan Anda harus dikirim?</p></div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.grid}>
                    {field("fullName", "Nama Penerima", "name")}
                    {field("phone", "Nomor Telepon", "tel", "tel")}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="checkout-email">Email</label>
                    <input id="checkout-email" value={email} disabled />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="checkout-address">Alamat Lengkap</label>
                    <textarea
                      id="checkout-address"
                      rows={4}
                      value={values.address}
                      onChange={(event) => setField("address", event.target.value)}
                      autoComplete="street-address"
                      disabled={submitting}
                      aria-invalid={Boolean(errors.address)}
                    />
                    {errors.address && <span>{errors.address}</span>}
                  </div>
                  <div className={styles.grid}>
                    {field("city", "Kota / Kabupaten", "address-level2")}
                    {field("province", "Provinsi", "address-level1")}
                  </div>
                  {field("postalCode", "Kode Pos", "postal-code", "numeric")}
                  <div className={styles.field}>
                    <label htmlFor="checkout-courier">Kurir</label>
                    <select
                      id="checkout-courier"
                      value={values.courier}
                      onChange={(event) =>
                        selectCourier(event.target.value as ShippingCourier | "")
                      }
                      disabled={submitting}
                      aria-invalid={Boolean(errors.courier)}
                      required
                    >
                      <option value="">Pilih kurir</option>
                      {Object.entries(SHIPPING_COURIER_LABELS).map(
                        ([value, label]) => (
                          <option value={value} key={value}>{label}</option>
                        )
                      )}
                    </select>
                    {errors.courier && <span>{errors.courier}</span>}
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="ri-bank-card-line" aria-hidden="true" />
                  <div><h2>Metode Pembayaran</h2><p>Lakukan pembayaran manual setelah pesanan dibuat.</p></div>
                </div>
                <div className={styles.paymentOptions}>
                  <label className={!qrisConfigured ? styles.unavailable : ""}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="qris"
                      checked={values.paymentMethod === "qris"}
                      onChange={() => selectPaymentMethod("qris")}
                      disabled={!qrisConfigured || submitting}
                    />
                    <span><strong>QRIS</strong><small>{qrisConfigured ? "Pindai kode QR dengan aplikasi pembayaran Anda" : "Belum dikonfigurasi"}</small></span>
                  </label>
                  <label className={!danaConfigured ? styles.unavailable : ""}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="dana"
                      checked={values.paymentMethod === "dana"}
                      onChange={() => selectPaymentMethod("dana")}
                      disabled={!danaConfigured || submitting}
                    />
                    <span><strong>DANA</strong><small>{danaConfigured ? "Bayar melalui akun DANA Anda" : "Belum dikonfigurasi"}</small></span>
                  </label>
                  <label className={!bankConfigured ? styles.unavailable : ""}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={values.paymentMethod === "bank_transfer"}
                      onChange={() => selectPaymentMethod("bank_transfer")}
                      disabled={!bankConfigured || submitting}
                    />
                    <span><strong>Transfer Bank</strong><small>{bankConfigured ? "Transfer ke rekening bank yang tersedia" : "Belum dikonfigurasi"}</small></span>
                  </label>
                  {errors.paymentMethod && <span className={styles.paymentError}>{errors.paymentMethod}</span>}
                </div>
              </section>
            </div>

            <aside className={styles.summary}>
              <h2>Ringkasan Pesanan</h2>
              <div className={styles.items}>
                {items.map((item) => (
                  <div className={styles.item} key={item.id}>
                    <div className={styles.image}>
                      <Image src={getProductImage(item)} alt={item.product?.name ?? "Produk"} fill sizes="64px" />
                      <span>{item.quantity}</span>
                    </div>
                    <div><strong>{item.product?.name ?? "Produk tidak tersedia"}</strong><small>{formatRupiah(item.product?.price ?? 0)}</small></div>
                    <b>{formatRupiah((item.product?.price ?? 0) * item.quantity)}</b>
                  </div>
                ))}
              </div>
              <div className={styles.costs}>
                <div><span>Subtotal</span><strong>{formatRupiah(totals.subtotal)}</strong></div>
                <div><span>Pengiriman</span><strong>{formatRupiah(shippingCost)}</strong></div>
                <div className={styles.total}><span>Total</span><strong>{formatRupiah(total)}</strong></div>
              </div>
              <button
                type="submit"
                disabled={
                  submitting ||
                  hasUnavailableItems ||
                  (!qrisConfigured && !danaConfigured && !bankConfigured)
                }
              >
                {submitting ? "Membuat Pesanan..." : "Buat Pesanan"}
              </button>
              {hasUnavailableItems && <p>Kembali ke keranjang dan periksa produk yang tidak tersedia.</p>}
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
