"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";

export default function CartBadge() {
  const { itemCount, loading } = useCart();

  return (
    <Link
      href="/cart"
      className="cart-nav-link"
      aria-label={`Shopping cart with ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
    >
      <i className="ri-shopping-cart-2-line" aria-hidden="true" />
      <span aria-hidden="true">{loading ? 0 : itemCount}</span>
    </Link>
  );
}
