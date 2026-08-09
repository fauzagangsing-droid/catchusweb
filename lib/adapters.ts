import type { ProductWithRelations } from "@/types/database";
import type { Product as UiProduct } from "@/types/product";

interface ProductImageSource {
  product_images?: ReadonlyArray<{
    image_url: string;
    is_thumbnail: boolean;
  }> | null;
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

export function resolveProductImage(
  product: ProductImageSource | null | undefined
): string {
  const images = product?.product_images ?? [];
  const thumbnail = images.find((image) => image.is_thumbnail);
  return thumbnail?.image_url ?? images[0]?.image_url ?? "/images/catchus.PNG";
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

/**
 * Converts a Supabase product row (+ joined category/images) into the exact
 * shape ProdukCard.tsx already expects, so the presentation layer requires
 * no changes at all.
 */
export function toUiProduct(product: ProductWithRelations): UiProduct {
  return {
    id: product.id,
    slug: product.slug,
    filter: (product.category?.slug ?? "uncategorized") as UiProduct["filter"],
    image: resolveProductImage(product),
    alt: product.name,
    badge: resolveBadge(product),
    title: product.name,
    shortDescription: product.short_description ?? "",
    priceOld: product.compare_price ? formatRupiah(product.compare_price) : "",
    priceNew: formatRupiah(product.price),
    weight: product.weight,
  };
}
