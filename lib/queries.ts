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

  return { data: (data as unknown as ProductWithRelations[]) ?? [], error: null };
}
