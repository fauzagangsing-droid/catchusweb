import "server-only";
import { supabase } from "@/lib/supabase";
import type { Category, ProductWithRelations } from "@/types/database";

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * All active categories, alphabetical by name.
 */
export async function getCategories(): Promise<QueryResult<Category[]>> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data ?? [], error: null };
}

/**
 * All active products with their category and images joined in.
 * Ordered newest-first, matching a typical catalog default.
 */
export async function getProducts(): Promise<QueryResult<ProductWithRelations[]>> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        category:categories ( * ),
        product_images ( * )
      `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/** One public, active product for the storefront detail route. */
export async function getProductBySlug(
  slug: string
): Promise<QueryResult<ProductWithRelations>> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        category:categories ( * ),
        product_images ( * )
      `
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** Active products from the same category for the related-products section. */
export async function getRelatedProducts(
  categoryId: string | null,
  excludeProductId: string,
  limit = 4
): Promise<QueryResult<ProductWithRelations[]>> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        category:categories ( * ),
        product_images ( * )
      `
    )
    .eq("status", "active")
    .neq("id", excludeProductId)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, limit));

  if (error) return { data: null, error: error.message };

  const related = [...(data ?? [])]
    .sort(
      (a, b) =>
        Number(Boolean(categoryId) && b.category_id === categoryId) -
        Number(Boolean(categoryId) && a.category_id === categoryId)
    )
    .slice(0, limit);

  return { data: related, error: null };
}
