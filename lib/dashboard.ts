import "server-only";

import { formatRupiah, resolveProductImage } from "@/lib/adapters";
import type { DashboardStats, RecentProduct } from "@/types/dashboard";
import type { ProductWithRelations } from "@/types/database";

export type { DashboardStats } from "@/types/dashboard";

/**
 * Compact relative-time label ("2h ago") for the "Latest Update" stat,
 * falling back to a short date once it's more than a week old.
 */
function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Derives the four dashboard StatCard values from the products already
 * fetched via getProducts(), plus the total category count from
 * getCategories() (so categories with zero products still get counted).
 */
export function toDashboardStats(
  products: ProductWithRelations[],
  totalCategories: number
): DashboardStats {
  const featuredProducts = products.filter((product) => product.featured).length;

  const latestTimestamp = products.reduce<string | null>((latest, product) => {
    if (!latest) return product.created_at;
    return new Date(product.created_at) > new Date(latest) ? product.created_at : latest;
  }, null);

  return {
    totalProducts: products.length,
    totalCategories,
    featuredProducts,
    latestUpdate: latestTimestamp ? formatRelativeTime(latestTimestamp) : "—",
  };
}

/**
 * Maps the newest products (getProducts() already orders created_at DESC)
 * into the RecentProduct shape RecentProducts.tsx renders.
 */
export function toRecentProducts(
  products: ProductWithRelations[],
  limit = 5
): RecentProduct[] {
  return products.slice(0, limit).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category?.name ?? "Uncategorized",
    price: formatRupiah(product.price),
    image: resolveProductImage(product),
    featured: product.featured,
  }));
}
