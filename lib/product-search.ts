"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";

export interface ProductSearchResult {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  categoryName: string | null;
}

const SEARCH_RESULT_LIMIT = 8;

function sanitizeSearchTerm(input: string): string {
  // PostgREST's .or() filter uses punctuation as syntax. Replacing those
  // characters keeps user input safely inside the ilike values.
  return input.replace(/[%_,().'"\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Searches only the small set of fields rendered by the Navbar dropdown. */
export async function searchProducts(
  input: string,
  signal?: AbortSignal
): Promise<ProductSearchResult[]> {
  const term = sanitizeSearchTerm(input);
  if (!term) return [];

  let categoryQuery = supabaseBrowser
    .from("categories")
    .select("id")
    .ilike("name", `%${term}%`)
    .limit(SEARCH_RESULT_LIMIT);

  if (signal) categoryQuery = categoryQuery.abortSignal(signal);
  const { data: matchingCategories, error: categoryError } = await categoryQuery;
  if (categoryError) throw categoryError;

  const categoryIds = (matchingCategories ?? []).map((category) => category.id);
  const filters = [`name.ilike.%${term}%`, `brand.ilike.%${term}%`];
  if (categoryIds.length > 0) filters.push(`category_id.in.(${categoryIds.join(",")})`);

  let productQuery = supabaseBrowser
    .from("products")
    .select("id, slug, name, brand, price, category:categories(name)")
    .eq("status", "active")
    .or(filters.join(","))
    .order("featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(SEARCH_RESULT_LIMIT);

  if (signal) productQuery = productQuery.abortSignal(signal);
  const { data, error } = await productQuery;
  if (error) throw error;

  return (data ?? []).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    categoryName: product.category?.name ?? null,
  }));
}
