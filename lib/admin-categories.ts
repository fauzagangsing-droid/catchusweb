"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Category, CategoryInsert, CategoryUpdate } from "@/types/database";

export interface AdminQueryResult<T> {
  data: T | null;
  error: string | null;
}

export interface CategoryWithProductCount extends Category {
  product_count: number;
}

export interface CategoryFormValues {
  name: string;
  slug: string;
}

export type CategoryFormErrors = Partial<Record<keyof CategoryFormValues, string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("categories_name_lower_key")) {
    return "That category name is already in use.";
  }
  if (message.includes("categories_slug") || message.includes("slug_key")) {
    return "That slug is already in use by another category.";
  }
  if (message.includes("still assigned") || message.includes("still used")) {
    return "This category cannot be deleted while products are assigned to it.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to do that. Please sign in again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

/** Converts a category name to the lowercase, hyphen-separated URL slug used by the storefront. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateCategoryForm(values: CategoryFormValues): CategoryFormErrors {
  const errors: CategoryFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Category name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Category name must be at least 2 characters.";
  }

  if (!values.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(values.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers, and hyphens.";
  }

  return errors;
}

/** Returns every category with an embedded count of products assigned to it. */
export async function getAdminCategories(
  search?: string
): Promise<AdminQueryResult<CategoryWithProductCount[]>> {
  let query = supabaseBrowser
    .from("categories")
    .select("*, products(count)")
    .order("name", { ascending: true });

  if (search?.trim()) {
    const term = search.trim().replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: toFriendlyError(error.message) };

  const categories = ((data ?? []) as unknown as Array<
    Category & { products?: Array<{ count?: number }> }
  >).map(({ products, ...category }) => ({
    ...category,
    product_count: products?.[0]?.count ?? 0,
  }));

  return { data: categories, error: null };
}

/** Checks duplicates before a write; the database unique indexes remain the final guard against races. */
export async function findCategoryDuplicate(
  values: CategoryFormValues,
  excludeId?: string
): Promise<AdminQueryResult<"name" | "slug" | null>> {
  const name = values.name.trim();
  const slug = values.slug.trim();
  const [nameResult, slugResult] = await Promise.all([
    supabaseBrowser.from("categories").select("id").ilike("name", name),
    supabaseBrowser.from("categories").select("id").ilike("slug", slug),
  ]);

  if (nameResult.error) return { data: null, error: toFriendlyError(nameResult.error.message) };
  if (slugResult.error) return { data: null, error: toFriendlyError(slugResult.error.message) };

  const matchingNames = (nameResult.data ?? []) as unknown as Array<Pick<Category, "id">>;
  const matchingSlugs = (slugResult.data ?? []) as unknown as Array<Pick<Category, "id">>;

  if (matchingNames.some((category) => category.id !== excludeId)) {
    return { data: "name", error: null };
  }
  if (matchingSlugs.some((category) => category.id !== excludeId)) {
    return { data: "slug", error: null };
  }
  return { data: null, error: null };
}

export async function createCategory(
  input: CategoryInsert
): Promise<AdminQueryResult<Category>> {
  const { data, error } = await supabaseBrowser
    .from("categories")
    .insert(input as never)
    .select("*")
    .single();
  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: data as unknown as Category, error: null };
}

export async function updateCategory(
  id: string,
  input: CategoryUpdate
): Promise<AdminQueryResult<Category>> {
  const { data, error } = await supabaseBrowser
    .from("categories")
    .update(input as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: data as unknown as Category, error: null };
}

export async function deleteCategory(id: string): Promise<AdminQueryResult<true>> {
  const { count, error: countError } = await supabaseBrowser
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) return { data: null, error: toFriendlyError(countError.message) };
  if ((count ?? 0) > 0) {
    return {
      data: null,
      error: "This category cannot be deleted while products are assigned to it.",
    };
  }

  const { error } = await supabaseBrowser.from("categories").delete().eq("id", id);
  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: true, error: null };
}
