import "server-only";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, ProductWithRelations } from "@/types/database";
import {
  getWebsiteSettings as queryWebsiteSettings,
  type WebsiteSettingsResult,
} from "@/lib/website-settings";

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
}

/** All categories, alphabetical by name. */
export const getCategories = cache(async (): Promise<QueryResult<Category[]>> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
});

/** One category selected by its public slug. */
export const getCategoryBySlug = cache(
  async (slug: string): Promise<QueryResult<Category>> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }
);

/** All active products with category and image relations, newest first. */
export const getProducts = cache(
  async (): Promise<QueryResult<ProductWithRelations[]>> => {
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

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  }
);

/** Active products belonging to one category. */
export const getProductsByCategory = cache(
  async (categoryId: string): Promise<QueryResult<ProductWithRelations[]>> => {
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
      .eq("category_id", categoryId)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  }
);

export const getWebsiteSettings = cache(async (): Promise<WebsiteSettingsResult> => {
  return queryWebsiteSettings(supabase);
});

/** One public, active product for the storefront detail route. */
export const getProductBySlug = cache(
  async (slug: string): Promise<QueryResult<ProductWithRelations>> => {
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
);

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
