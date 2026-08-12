"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addProductToCart, friendlyCartError } from "@/lib/cart";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import { useCart } from "@/hooks/useCart";
import type { ProductSize, ProductSizeInventory } from "@/types/database";
import styles from "./AddToCartButton.module.css";

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  stock: number;
  sizes: ProductSizeInventory[];
}

export default function AddToCartButton({
  productId,
  productName,
  stock,
  sizes,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { refreshCart } = useCart();
  const [pendingAction, setPendingAction] = useState<"cart" | "buy_now" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  const enabledSizes = sizes.filter((size) => size.is_enabled);
  const requiresSize = enabledSizes.length > 0;

  async function handleAddToCart(buyNow = false) {
    if (requiresSize && !selectedSize) {
      setAdded(false);
      setMessage("Pilih ukuran sebelum melanjutkan.");
      return;
    }
    setPendingAction(buyNow ? "buy_now" : "cart");
    setMessage(null);
    setAdded(false);

    try {
      const supabase = createCustomerBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const returnPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?next=${encodeURIComponent(returnPath)}`);
        return;
      }

      await addProductToCart(productId, 1, selectedSize, supabase);
      await refreshCart();
      if (buyNow) {
        router.push("/checkout");
        return;
      }
      setAdded(true);
      setMessage(`${productName} berhasil ditambahkan ke keranjang.`);
    } catch (error) {
      setMessage(
        friendlyCartError(error instanceof Error ? error.message : "")
      );
    } finally {
      setPendingAction(null);
    }
  }

  const outOfStock = requiresSize
    ? enabledSizes.every((size) => size.stock < 1)
    : stock < 1;

  return (
    <div className={styles.wrapper}>
      {requiresSize && (
        <fieldset className={styles.sizeSelector}>
          <legend>Choose size</legend>
          <div className={styles.sizeOptions}>
            {enabledSizes.map((size) => {
              const unavailable = size.stock < 1;
              return (
                <button
                  key={size.size}
                  type="button"
                  className={selectedSize === size.size ? styles.selectedSize : ""}
                  onClick={() => {
                    setSelectedSize(size.size);
                    setMessage(null);
                  }}
                  disabled={unavailable || Boolean(pendingAction)}
                  aria-pressed={selectedSize === size.size}
                  aria-label={
                    unavailable ? `Size ${size.size}, out of stock` : `Size ${size.size}`
                  }
                >
                  {size.size}
                </button>
              );
            })}
          </div>
          <span>Select one available size before adding this product.</span>
        </fieldset>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={() => handleAddToCart(false)}
          disabled={Boolean(pendingAction) || outOfStock}
        >
          <i className="ri-shopping-cart-2-line" aria-hidden="true" />
          {outOfStock ? "Stok Habis" : pendingAction === "cart" ? "Menambahkan..." : "Tambah ke Keranjang"}
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buyNow}`}
          onClick={() => handleAddToCart(true)}
          disabled={Boolean(pendingAction) || outOfStock}
        >
          <i className="ri-flashlight-line" aria-hidden="true" />
          {outOfStock ? "Stok Habis" : pendingAction === "buy_now" ? "Memproses..." : "Beli Sekarang"}
        </button>
      </div>
      {message && (
        <p
          className={added ? styles.success : styles.error}
          role={added ? "status" : "alert"}
        >
          {message} {added && <Link href="/cart">Lihat keranjang</Link>}
        </p>
      )}
    </div>
  );
}
