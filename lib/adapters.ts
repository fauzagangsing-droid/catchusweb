import type { ProductWithRelations } from "@/types/database";
import type { Product as UiProduct } from "@/types/product";

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function resolveImage(product: ProductWithRelations): string {
  const thumbnail = product.product_images.find((img) => img.is_thumbnail);
  const fallback = product.product_images[0];
  return thumbnail?.image_url ?? fallback?.image_url ?? "/images/catchus.PNG";
}

function resolveBadge(product: ProductWithRelations): string {
  if (product.compare_price && product.compare_price > product.price) {
    const discount = Math.round(
      (1 - product.price / product.compare_price) * 100
    );
    return `${discount}%`;
  }
  return product.featured ? "Featured" : "";
}

function resolveBuyUrl(product: ProductWithRelations): string {
  return product.shopee_url || product.tiktok_url || product.tokopedia_url || "#";
}

/**
 * Converts a Supabase product row (+ joined category/images) into the exact
 * shape ProdukCard.tsx already expects, so the presentation layer requires
 * no changes at all.
 */
export function toUiProduct(product: ProductWithRelations): UiProduct {
  return {
    id: product.id,
    filter: (product.category?.slug ?? "uncategorized") as UiProduct["filter"],
    image: resolveImage(product),
    alt: product.name,
    badge: resolveBadge(product),
    title: product.name,
    priceOld: product.compare_price ? formatRupiah(product.compare_price) : "",
    priceNew: formatRupiah(product.price),
    buyUrl: resolveBuyUrl(product),
  };
}
