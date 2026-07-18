"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addProductToCart, friendlyCartError } from "@/lib/cart";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import { useCart } from "@/hooks/useCart";
import styles from "./AddToCartButton.module.css";

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  stock: number;
}

export default function AddToCartButton({
  productId,
  productName,
  stock,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { refreshCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function handleAddToCart() {
    setLoading(true);
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

      await addProductToCart(productId, 1, supabase);
      await refreshCart();
      setAdded(true);
      setMessage(`${productName} was added to your cart.`);
    } catch (error) {
      setMessage(
        friendlyCartError(error instanceof Error ? error.message : "")
      );
    } finally {
      setLoading(false);
    }
  }

  const outOfStock = stock < 1;

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={handleAddToCart}
        disabled={loading || outOfStock}
      >
        <i className="ri-shopping-cart-2-line" aria-hidden="true" />
        {outOfStock ? "Out of Stock" : loading ? "Adding..." : "Add To Cart"}
      </button>
      {message && (
        <p
          className={added ? styles.success : styles.error}
          role={added ? "status" : "alert"}
        >
          {message} {added && <Link href="/cart">View cart</Link>}
        </p>
      )}
    </div>
  );
}
