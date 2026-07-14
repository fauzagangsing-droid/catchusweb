"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type {
  Category,
  ProductInsert,
  ProductStatus,
  ProductUpdate,
  ProductWithRelations,
} from "@/types/database";

/**
 * Admin-only product data access, used exclusively by the Product Management
 * module (app/admin/products). This intentionally mirrors the client-side
 * pattern already used by AdminLoginForm.tsx / Sidebar.tsx (supabaseBrowser,
 * "use client") rather than lib/queries.ts's server-only singleton, because
 * that singleton is a shared anon-key client with no user session attached —
 * it can never satisfy the `authenticated`-only RLS write policies added in
 * supabase/admin_rls_policies.sql. supabaseBrowser carries the signed-in
 * admin's session, which is what those policies check.
 */

export interface AdminQueryResult<T> {
  data: T | null;
  error: string | null;
}

export type FeaturedFilter = "all" | "featured" | "not_featured";
export type ActiveFilter = "all" | "active" | "inactive";

export type ProductSortField = "created_at" | "name" | "price" | "stock";
export type SortDirection = "asc" | "desc";

export interface ProductListParams {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string | "all";
  featured?: FeaturedFilter;
  active?: ActiveFilter;
  sortField?: ProductSortField;
  sortDirection?: SortDirection;
}

export interface ProductListResult {
  products: ProductWithRelations[];
  totalCount: number;
}

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("duplicate key") && message.includes("slug")) {
    return "That slug is already in use by another product. Try a different one.";
  }
  if (message.includes("duplicate key") && message.includes("sku")) {
    return "That SKU is already in use by another product.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to do that. Please sign in again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * Categories for the filter dropdown and the Add/Edit Product form.
 * Client-side counterpart to lib/queries.ts's getCategories(); duplicated
 * rather than shared because that one is guarded by `import "server-only"`
 * and cannot run from a "use client" component.
 */
export async function getCategoriesBrowser(): Promise<AdminQueryResult<Category[]>> {
  const { data, error } = await supabaseBrowser
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: data ?? [], error: null };
}

/**
 * Paginated, filtered, sorted product list for the admin table. Reads every
 * status (draft/inactive/out_of_stock included) thanks to the "Authenticated
 * read all products" RLS policy — the public getProducts() in lib/queries.ts
 * only ever sees status = 'active'.
 */
export async function getAdminProducts(
  params: ProductListParams
): Promise<AdminQueryResult<ProductListResult>> {
  const {
    page,
    pageSize,
    search,
    categoryId,
    featured = "all",
    active = "all",
    sortField = "created_at",
    sortDirection = "desc",
  } = params;

  let query = supabaseBrowser
    .from("products")
    .select(
      `
        *,
        category:categories ( * ),
        product_images ( * )
      `,
      { count: "exact" }
    );

  if (search && search.trim().length > 0) {
    const term = search.trim().replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }

  if (categoryId && categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  if (featured === "featured") {
    query = query.eq("featured", true);
  } else if (featured === "not_featured") {
    query = query.eq("featured", false);
  }

  if (active === "active") {
    query = query.eq("status", "active");
  } else if (active === "inactive") {
    query = query.eq("status", "inactive");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(sortField, { ascending: sortDirection === "asc" })
    .range(from, to);

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }

  return {
    data: {
      products: (data as unknown as ProductWithRelations[]) ?? [],
      totalCount: count ?? 0,
    },
    error: null,
  };
}

export async function createProduct(
  input: ProductInsert
): Promise<AdminQueryResult<ProductWithRelations>> {
  const { data, error } = await supabaseBrowser
    .from("products")
    .insert(input)
    .select(
      `
        *,
        category:categories ( * ),
        product_images ( * )
      `
    )
    .single();

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: data as unknown as ProductWithRelations, error: null };
}

export async function updateProduct(
  id: string,
  input: ProductUpdate
): Promise<AdminQueryResult<ProductWithRelations>> {
  const { data, error } = await supabaseBrowser
    .from("products")
    .update(input)
    .eq("id", id)
    .select(
      `
        *,
        category:categories ( * ),
        product_images ( * )
      `
    )
    .single();

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: data as unknown as ProductWithRelations, error: null };
}

export async function deleteProduct(id: string): Promise<AdminQueryResult<true>> {
  const { error } = await supabaseBrowser.from("products").delete().eq("id", id);

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: true, error: null };
}

export async function setProductFeatured(
  id: string,
  featured: boolean
): Promise<AdminQueryResult<true>> {
  const { error } = await supabaseBrowser.from("products").update({ featured }).eq("id", id);

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: true, error: null };
}

/**
 * The schema has no boolean `active` column — status is one of
 * active/inactive/draft/out_of_stock. The Active toggle/filter in this
 * module treats "active" as active and everything else as inactive, and
 * toggling simply flips between those two states.
 */
export async function setProductStatus(
  id: string,
  status: ProductStatus
): Promise<AdminQueryResult<true>> {
  const { error } = await supabaseBrowser.from("products").update({ status }).eq("id", id);

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: true, error: null };
}

/**
 * Slugifies a product name: lowercase, ASCII, hyphen-separated.
 * "Oversized Knit Sweater!" -> "oversized-knit-sweater"
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ProductFormValues {
  name: string;
  slug: string;
  price: string;
  categoryId: string;
  description: string;
  featured: boolean;
  active: boolean;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates the Add/Edit Product form and returns friendly, field-level
 * messages. Returns an empty object when the form is valid.
 */
export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Product name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Product name must be at least 2 characters.";
  }

  if (!values.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(values.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers, and hyphens.";
  }

  const priceValue = Number(values.price);
  if (!values.price.trim()) {
    errors.price = "Price is required.";
  } else if (Number.isNaN(priceValue) || priceValue < 0) {
    errors.price = "Price must be a valid positive number.";
  }

  if (!values.categoryId) {
    errors.categoryId = "Please select a category.";
  }

  return errors;
}
