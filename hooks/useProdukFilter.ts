"use client";

import { useState } from "react";
import type { Product } from "@/types/product";

/**
 * Replicates the original script.js category filter behavior:
 *
 *   btnfilter.forEach((btn) => {
 *       btn.addEventListener("click", () => {
 *           btnfilter.forEach((b) => b.classList.remove("active"));
 *           btn.classList.add("active");
 *           const filter = btn.textContent.toLowerCase();
 *           produkItem.forEach((item) => {
 *               const itemFilter = item.getAttribute("data-filter").toLowerCase();
 *               item.style.display =
 *                   filter === "all produk" || itemFilter === filter ? "block" : "none";
 *           });
 *       });
 *   });
 *
 * Instead of toggling DOM classes/inline styles directly, this tracks the
 * active filter label in state and derives which products are visible -
 * same resulting behavior, React-idiomatic implementation.
 */
export function useProdukFilter() {
  const [activeFilter, setActiveFilter] = useState("All Produk");

  const isVisible = (product: Product) => {
    const filter = activeFilter.toLowerCase();
    return filter === "all produk" || product.filter.toLowerCase() === filter;
  };

  return { activeFilter, setActiveFilter, isVisible };
}
