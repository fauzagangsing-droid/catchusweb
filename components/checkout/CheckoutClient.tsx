"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/hooks/useCart";
import { formatRupiah, resolveProductImage } from "@/lib/adapters";
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
  ShippingAddress,
} from "@/types/database";
import type { ShippingOption, ShippingQuoteResponse } from "@/types/shipping";
import AddressManager from "./AddressManager";
import styles from "./Checkout.module.css";

interface CheckoutClientProps {
  brandName: string;
  email: string;
  initialFullName: string;
  paymentSettings: PaymentSettings | null;
  initialAddresses: ShippingAddress[];
}

const quoteRequests = new Map<string, Promise<ShippingQuoteResponse>>();

async function requestShippingQuote(
  address: ShippingAddress,
  totalWeight: number
): Promise<ShippingQuoteResponse> {
  const key = `${address.id}:${address.village_code}:${totalWeight.toFixed(3)}`;
  const existing = quoteRequests.get(key);
  if (existing) return existing;
  const request = fetch("/api/shipping/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addressId: address.id }),
  })
    .then(async (response) => {
      const result = (await response.json()) as ShippingQuoteResponse & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Ongkir tidak dapat dihitung.");
      return result;
    })
    .catch((error) => {
      quoteRequests.delete(key);
      throw error;
    });
  quoteRequests.set(key, request);
  void request.then(
    () => {
      window.setTimeout(() => {
        if (quoteRequests.get(key) === request) quoteRequests.delete(key);
      }, 5 * 60 * 1000);
    },
    () => undefined
  );
  return request;
}

export default function CheckoutClient({
  brandName,
  email,
  initialFullName,
  paymentSettings,
  initialAddresses,
}: CheckoutClientProps) {
  const router = useRouter();
  const { refreshCart } = useCart();
  const qrisConfigured = paymentSettings ? isQrisConfigured(paymentSettings) : false;
  const danaConfigured = paymentSettings ? isDanaConfigured(paymentSettings) : false;
  const bankConfigured = paymentSettings
    ? isBankTransferConfigured(paymentSettings)
    : false;
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(
    initialAddresses.find((address) => address.is_default)?.id ?? initialAddresses[0]?.id ?? ""
  );
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    qrisConfigured ? "qris" : danaConfigured ? "dana" : "bank_transfer"
  );
  const [loading, setLoading] = useState(true);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCart()
      .then((cart) => {
        if (active) setItems(cart?.items ?? []);
      })
      .catch(() => {
        if (active) setError("Keranjang tidak dapat dimuat. Silakan coba lagi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => calculateCartTotals(items), [items]);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;

  useEffect(() => {
    let active = true;
    setSelectedOption(null);
    setShippingOptions([]);
    setShippingError(null);
    if (!selectedAddress || items.length === 0) return () => { active = false; };

    setLoadingShipping(true);
    requestShippingQuote(selectedAddress, totals.totalWeight)
      .then((quote) => {
        if (active) setShippingOptions(quote.options);
      })
      .catch((quoteError) => {
        if (active) {
          setShippingError(
            quoteError instanceof Error ? quoteError.message : "Ongkir tidak dapat dihitung."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingShipping(false);
      });
    return () => { active = false; };
  }, [selectedAddress, items.length, quoteVersion, totals.totalWeight]);

  const shippingCost = selectedOption?.cost ?? 0;
  const discount = voucher?.discount ?? 0;
  const total = Math.max(totals.subtotal + shippingCost - discount, 0);
  const hasUnavailableItems = items.some(
    (item) => !item.product || item.product.stock < item.quantity
  );

  function handleAddressesChange(nextAddresses: ShippingAddress[], preferredId?: string) {
    setAddresses(nextAddresses);
    const nextSelected =
      preferredId ??
      nextAddresses.find((address) => address.id === selectedAddressId)?.id ??
      nextAddresses.find((address) => address.is_default)?.id ??
      nextAddresses[0]?.id ??
      "";
    setSelectedAddressId(nextSelected);
    setSelectedOption(null);
  }

  async function applyVoucher() {
    if (!voucherInput.trim()) { setVoucherError("Masukkan kode voucher."); return; }
    setValidatingVoucher(true); setVoucherError(null);
    try {
      const response = await fetch("/api/vouchers/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: voucherInput, subtotal: totals.subtotal }) });
      const result = (await response.json()) as { code?: string; discount?: number; error?: string };
      if (!response.ok || !result.code || typeof result.discount !== "number") throw new Error(result.error ?? "Voucher tidak valid.");
      setVoucher({ code: result.code, discount: result.discount }); setVoucherInput(result.code); setToast("Voucher berhasil diterapkan."); window.setTimeout(() => setToast(null), 3000);
    } catch (voucherFailure) { setVoucher(null); setVoucherError(voucherFailure instanceof Error ? voucherFailure.message : "Voucher tidak valid."); }
    finally { setValidatingVoucher(false); }
  }

  async function placeOrder() {
    if (!selectedAddress) {
      setError("Pilih atau tambahkan alamat pengiriman.");
      return;
    }
    if (!selectedOption) {
      setError("Pilih layanan kurir terlebih dahulu.");
      return;
    }
    if (hasUnavailableItems || items.length === 0) {
      setError("Periksa ketersediaan produk sebelum membuat pesanan.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddress.id,
          shippingQuoteToken: selectedOption.quoteToken,
          paymentMethod,
          voucherCode: voucher?.code,
        }),
      });
      const result = (await response.json()) as { orderNumber?: string; error?: string };
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
          <p>Pilih alamat, bandingkan semua layanan kurir yang tersedia, lalu konfirmasi pembayaran.</p>
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
          <div className={styles.layout}>
            <div className={styles.formColumn}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="ri-coupon-3-line" aria-hidden="true" />
                  <div><h2>Voucher</h2><p>Gunakan kode promo sebelum membuat pesanan.</p></div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.voucherRow}><input value={voucherInput} onChange={(event) => { setVoucherInput(event.target.value.toUpperCase()); setVoucher(null); setVoucherError(null); }} placeholder="KODE VOUCHER" disabled={validatingVoucher || submitting} /><button type="button" onClick={() => void applyVoucher()} disabled={validatingVoucher || submitting}>{validatingVoucher ? "Memeriksa..." : "Gunakan"}</button></div>
                  {voucherError && <p className={styles.quoteError} role="alert">{voucherError}</p>}
                  {voucher && <p className={styles.voucherSuccess}>{voucher.code} diterapkan: -{formatRupiah(voucher.discount)}</p>}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="ri-map-pin-line" aria-hidden="true" />
                  <div><h2>Alamat Pengiriman</h2><p>Pilih alamat tersimpan atau tambahkan alamat baru.</p></div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.field}>
                    <label htmlFor="checkout-email">Email</label>
                    <input id="checkout-email" value={email} disabled />
                  </div>
                  <AddressManager
                    addresses={addresses}
                    selectedAddressId={selectedAddressId}
                    initialRecipientName={initialFullName}
                    disabled={submitting}
                    onSelect={setSelectedAddressId}
                    onAddressesChange={handleAddressesChange}
                  />
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="ri-truck-line" aria-hidden="true" />
                  <div><h2>Pilih Kurir</h2><p>Semua opsi berikut berasal langsung dari API.co.id.</p></div>
                </div>
                <div className={styles.shippingOptions}>
                  {!selectedAddress ? (
                    <p className={styles.optionNotice}>Pilih alamat untuk melihat ongkir.</p>
                  ) : loadingShipping ? (
                    <p className={styles.optionNotice}>Menghitung ongkir dan memuat kurir...</p>
                  ) : shippingError ? (
                    <div className={styles.quoteError} role="alert">
                      <span>{shippingError}</span>
                      <button type="button" onClick={() => {
                        quoteRequests.delete(
                          `${selectedAddress.id}:${selectedAddress.village_code}:${totals.totalWeight.toFixed(3)}`
                        );
                        setQuoteVersion((version) => version + 1);
                      }}>Coba Lagi</button>
                    </div>
                  ) : (
                    shippingOptions.map((option) => (
                      <label className={styles.shippingOption} key={`${option.courierCode}:${option.cost}`}>
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={selectedOption?.quoteToken === option.quoteToken}
                          onChange={() => setSelectedOption(option)}
                          disabled={submitting}
                        />
                        <span>
                          <strong>{option.courierName}</strong>
                          <small>{option.courierCode} · {option.estimation ?? "Estimasi tidak tersedia"}</small>
                        </span>
                        <b>{formatRupiah(option.cost)}</b>
                      </label>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="ri-bank-card-line" aria-hidden="true" />
                  <div><h2>Metode Pembayaran</h2><p>Lakukan pembayaran manual setelah pesanan dibuat.</p></div>
                </div>
                <div className={styles.paymentOptions}>
                  <label className={!qrisConfigured ? styles.unavailable : ""}>
                    <input type="radio" name="paymentMethod" value="qris" checked={paymentMethod === "qris"} onChange={() => setPaymentMethod("qris")} disabled={!qrisConfigured || submitting} />
                    <span><strong>QRIS</strong><small>{qrisConfigured ? "Pindai kode QR dengan aplikasi pembayaran Anda" : "Belum dikonfigurasi"}</small></span>
                  </label>
                  <label className={!danaConfigured ? styles.unavailable : ""}>
                    <input type="radio" name="paymentMethod" value="dana" checked={paymentMethod === "dana"} onChange={() => setPaymentMethod("dana")} disabled={!danaConfigured || submitting} />
                    <span><strong>DANA</strong><small>{danaConfigured ? "Bayar melalui akun DANA Anda" : "Belum dikonfigurasi"}</small></span>
                  </label>
                  <label className={!bankConfigured ? styles.unavailable : ""}>
                    <input type="radio" name="paymentMethod" value="bank_transfer" checked={paymentMethod === "bank_transfer"} onChange={() => setPaymentMethod("bank_transfer")} disabled={!bankConfigured || submitting} />
                    <span><strong>Transfer Bank</strong><small>{bankConfigured ? "Transfer ke rekening bank yang tersedia" : "Belum dikonfigurasi"}</small></span>
                  </label>
                </div>
              </section>
            </div>

            <aside className={styles.summary}>
              <h2>Ringkasan Pesanan</h2>
              <div className={styles.items}>
                {items.map((item) => (
                  <div className={styles.item} key={item.id}>
                    <div className={styles.image}>
                      <Image
                        src={resolveProductImage(item.product)}
                        alt={item.product?.name ?? "Produk"}
                        fill
                        sizes="64px"
                      />
                      <span>{item.quantity}</span>
                    </div>
                    <div><strong>{item.product?.name ?? "Produk tidak tersedia"}</strong><small>{formatRupiah(item.product?.price ?? 0)}</small></div>
                    <b>{formatRupiah((item.product?.price ?? 0) * item.quantity)}</b>
                  </div>
                ))}
              </div>
              {selectedOption && (
                <div className={styles.selectedShipping}>
                  <span>{selectedOption.courierName}</span>
                  <small>{selectedOption.estimation ?? "Estimasi tidak tersedia"}</small>
                </div>
              )}
              <div className={styles.costs}>
                <div><span>Subtotal</span><strong>{formatRupiah(totals.subtotal)}</strong></div>
                <div><span>Total Berat</span><strong>{totals.totalWeight.toFixed(2)} kg</strong></div>
                {voucher && <div><span>Diskon ({voucher.code})</span><strong>-{formatRupiah(discount)}</strong></div>}
                <div><span>Pengiriman</span><strong>{selectedOption ? formatRupiah(shippingCost) : "Belum dipilih"}</strong></div>
                <div className={styles.total}><span>Total</span><strong>{formatRupiah(total)}</strong></div>
              </div>
              <button
                type="button"
                onClick={() => void placeOrder()}
                disabled={submitting || hasUnavailableItems || !selectedAddress || !selectedOption || (!qrisConfigured && !danaConfigured && !bankConfigured)}
              >
                {submitting ? "Membuat Pesanan..." : "Buat Pesanan"}
              </button>
              {hasUnavailableItems && <p>Periksa stok produk sebelum melanjutkan.</p>}
            </aside>
          </div>
        )}
      </main>
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}
