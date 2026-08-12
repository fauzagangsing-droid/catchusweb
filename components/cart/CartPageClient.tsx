"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatRupiah, resolveProductImage } from "@/lib/adapters";
import {
  calculateCartTotals,
  friendlyCartError,
  getCartItemAvailableStock,
  getCart,
  isCartItemAvailable,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart";
import { useCart } from "@/hooks/useCart";
import type { CartItemWithProduct } from "@/types/database";
import styles from "./CartPage.module.css";

interface CartPageClientProps {
  brandName: string;
}

export default function CartPageClient({ brandName }: CartPageClientProps) {
  const { refreshCart } = useCart();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      const cart = await getCart();
      setItems(cart?.items ?? []);
      setError(null);
    } catch (loadError) {
      setError(
        friendlyCartError(loadError instanceof Error ? loadError.message : "")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const totals = useMemo(() => calculateCartTotals(items), [items]);
  const hasUnavailableItems = items.some((item) => !isCartItemAvailable(item));

  async function changeQuantity(item: CartItemWithProduct, nextQuantity: number) {
    if (
      busyItemId ||
      !item.product ||
      nextQuantity < 1 ||
      nextQuantity > getCartItemAvailableStock(item)
    ) {
      return;
    }

    const previousItems = items;
    setBusyItemId(item.id);
    setError(null);
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, quantity: nextQuantity }
          : currentItem
      )
    );

    try {
      await updateCartItemQuantity(item.id, nextQuantity);
      await refreshCart();
    } catch (quantityError) {
      setItems(previousItems);
      setError(
        friendlyCartError(
          quantityError instanceof Error ? quantityError.message : ""
        )
      );
      await loadCart();
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    if (busyItemId) return;

    const previousItems = items;
    setBusyItemId(itemId);
    setError(null);
    setItems((current) => current.filter((item) => item.id !== itemId));

    try {
      await removeCartItem(itemId);
      await refreshCart();
    } catch (removeError) {
      setItems(previousItems);
      setError(
        friendlyCartError(
          removeError instanceof Error ? removeError.message : ""
        )
      );
      await loadCart();
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>{brandName}</Link>
          <Link href="/#produk" className={styles.continueLink}>
            <i className="ri-arrow-left-line" aria-hidden="true" />
            Lanjut Belanja
          </Link>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        <div className={styles.titleRow}>
          <div>
            <span className={styles.eyebrow}>Pesanan Anda</span>
            <h1>Keranjang Belanja</h1>
          </div>
          {!loading && items.length > 0 && (
            <span className={styles.itemCount}>
              {totals.itemCount} barang
            </span>
          )}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {loading ? (
          <div className={styles.loading} role="status">Memuat keranjang...</div>
        ) : items.length === 0 ? (
          <section className={styles.empty}>
            <i className="ri-shopping-cart-line" aria-hidden="true" />
            <h2>Keranjang Anda kosong</h2>
            <p>Jelajahi produk terbaru Catchus dan tambahkan produk favorit Anda.</p>
            <Link href="/#produk">Lanjut Belanja</Link>
          </section>
        ) : (
          <div className={styles.layout}>
            <section className={styles.items} aria-label="Barang dalam keranjang">
              {items.map((item) => {
                const product = item.product;
                const itemBusy = busyItemId === item.id;
                const itemSubtotal = product ? product.price * item.quantity : 0;
                const availableStock = getCartItemAvailableStock(item);

                return (
                  <article className={styles.item} key={item.id}>
                    <div className={styles.imageWrap}>
                      <Image
                        src={resolveProductImage(item.product)}
                        alt={product ? `Gambar produk ${product.name}` : "Produk tidak tersedia"}
                        fill
                        sizes="(max-width: 640px) 96px, 130px"
                      />
                    </div>

                    <div className={styles.itemDetails}>
                      {product ? (
                        <Link href={`/product/${product.slug}`} className={styles.productName}>
                          {product.name}
                        </Link>
                      ) : (
                        <strong className={styles.productName}>Produk tidak tersedia</strong>
                      )}

                      {(item.selected_size || item.selected_color) && (
                        <div className={styles.variants}>
                          {item.selected_size && <span>Ukuran: {item.selected_size}</span>}
                          {item.selected_color && <span>Warna: {item.selected_color}</span>}
                        </div>
                      )}

                      {product && <span className={styles.unitPrice}>{formatRupiah(product.price)}</span>}

                      <div className={styles.mobileActions}>
                        <div className={styles.quantity} aria-label={`Jumlah ${product?.name ?? "produk"}`}>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item, item.quantity - 1)}
                            disabled={itemBusy || item.quantity <= 1 || !product}
                            aria-label="Kurangi jumlah"
                          >
                            <i className="ri-subtract-line" aria-hidden="true" />
                          </button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item, item.quantity + 1)}
                            disabled={itemBusy || !product || item.quantity >= availableStock}
                            aria-label="Tambah jumlah"
                          >
                            <i className="ri-add-line" aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => removeItem(item.id)}
                          disabled={itemBusy}
                        >
                          <i className="ri-delete-bin-6-line" aria-hidden="true" />
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className={styles.itemTotal}>
                      <span>Subtotal</span>
                      <strong>{formatRupiah(itemSubtotal)}</strong>
                      {product && availableStock < item.quantity && (
                        <small>Stok tersisa {availableStock}</small>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className={styles.summary}>
              <h2>Ringkasan Pesanan</h2>
              <div className={styles.summaryLine}>
                <span>Subtotal ({totals.itemCount} barang)</span>
                <strong>{formatRupiah(totals.subtotal)}</strong>
              </div>
              <div className={styles.summaryLine}>
                <span>Total Berat</span>
                <strong>{totals.totalWeight.toFixed(2)} kg</strong>
              </div>
              <div className={styles.totalLine}>
                <span>Total Keseluruhan</span>
                <strong>{formatRupiah(totals.grandTotal)}</strong>
              </div>
              {hasUnavailableItems ? (
                <button type="button" disabled>Lanjutkan Pesanan</button>
              ) : (
                <Link href="/checkout" className={styles.checkoutLink}>Lanjutkan Pesanan</Link>
              )}
              {hasUnavailableItems && (
                <p>Hapus produk yang tidak tersedia atau sesuaikan jumlahnya sebelum checkout.</p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
