"use client";

import { z } from "zod";
import { slugify } from "@/lib/slugify";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type {
  Category,
  ProductInsert,
  ProductStatus,
  ProductUpdate,
  ProductWithRelations,
} from "@/types/database";

export { slugify };

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

export const NEW_ARRIVAL_LIMIT = 2;
export const NEW_ARRIVAL_LIMIT_MESSAGE =
  "Only 2 New Arrival products can be selected. Remove one before selecting another.";
export const NEW_ARRIVAL_THUMBNAIL_REQUIRED_MESSAGE =
  "Upload a custom New Arrival thumbnail before selecting this product.";
export const NEW_ARRIVAL_ACTIVE_REQUIRED_MESSAGE =
  "Only active products can be selected for New Arrivals.";

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
  newArrivalCount: number;
}

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("new_arrival_limit_reached")) {
    return NEW_ARRIVAL_LIMIT_MESSAGE;
  }
  if (message.includes("new_arrival_thumbnail_required")) {
    return NEW_ARRIVAL_THUMBNAIL_REQUIRED_MESSAGE;
  }
  if (message.includes("new_arrival_active_required")) {
    return NEW_ARRIVAL_ACTIVE_REQUIRED_MESSAGE;
  }
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

  const [productsResult, newArrivalResult] = await Promise.all([
    query
      .order(sortField, { ascending: sortDirection === "asc" })
      .range(from, to),
    supabaseBrowser
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("featured", true),
  ]);

  const { data, error, count } = productsResult;

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  if (newArrivalResult.error) {
    return { data: null, error: toFriendlyError(newArrivalResult.error.message) };
  }

  return {
    data: {
      products: data ?? [],
      totalCount: count ?? 0,
      newArrivalCount: newArrivalResult.count ?? 0,
    },
    error: null,
  };
}

export async function createProduct(
  input: ProductInsert
): Promise<AdminQueryResult<ProductWithRelations>> {
  const { data, error } = await supabaseBrowser
    .from("products")
    .insert([input])
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
  return { data, error: null };
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
  return { data, error: null };
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
  if (featured) {
    const { data: product, error: productError } = await supabaseBrowser
      .from("products")
      .select("new_arrival_image_url")
      .eq("id", id)
      .single();

    if (productError) {
      return { data: null, error: toFriendlyError(productError.message) };
    }
    if (!product.new_arrival_image_url) {
      return { data: null, error: NEW_ARRIVAL_THUMBNAIL_REQUIRED_MESSAGE };
    }

    const { count, error: countError } = await supabaseBrowser
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("featured", true)
      .neq("id", id);

    if (countError) {
      return { data: null, error: toFriendlyError(countError.message) };
    }
    if ((count ?? 0) >= NEW_ARRIVAL_LIMIT) {
      return { data: null, error: NEW_ARRIVAL_LIMIT_MESSAGE };
    }
  }

  const { error } = await supabaseBrowser.from("products").update({ featured }).eq("id", id);

  if (error) {
    return { data: null, error: toFriendlyError(error.message) };
  }
  return { data: true, error: null };
}

/**
 * The schema has no boolean `active` column — status is one of
 * active/inactive/draft/out_of_stock. The table filter selects `active` or
 * `inactive` explicitly, while its toggle switches between those two states.
 * Product forms may still use the other enum values.
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
 * Resolved image state for the Product Image Upload feature, produced by
 * ImageUploader and carried through ProductFormValues so
 * app/admin/products/page.tsx can save/replace/remove the product_images
 * row and purge Supabase Storage after the product itself is saved.
 */
export interface ProductImageFormItem {
  id: string | null;
  imageUrl: string;
  isThumbnail: boolean;
  /** Present only for files uploaded during this form session. */
  storagePath: string | null;
}

export interface RemovedProductImage {
  id: string;
  storagePath: string | null;
}

export interface ProductImagesFieldValue {
  /** Existing id in Edit mode or a client-generated id in Add mode. */
  productId: string;
  images: ProductImageFormItem[];
  removedImages: RemovedProductImage[];
  uploading: boolean;
}

export interface ProductFormValues {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  price: string;
  comparePrice: string;
  categoryId: string;
  stock: string;
  weight: string;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  featured: boolean;
  shopeeUrl: string;
  tokopediaUrl: string;
  tiktokShopUrl: string;
  lazadaUrl: string;
  blibliUrl: string;
  newArrivalThumbnail: {
    imageUrl: string | null;
    file: File | null;
  };
  images: ProductImagesFieldValue;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WEIGHT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function isHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required.").min(2, "Product name must be at least 2 characters."),
    slug: z.string().trim().min(1, "Slug is required.").regex(SLUG_PATTERN, "Slug can only contain lowercase letters, numbers, and hyphens."),
    brand: z.string(),
    sku: z.string(),
    price: z.string().trim().min(1, "Price is required.").refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
      "Price must be a valid positive number."
    ),
    comparePrice: z.string().refine(
      (value) => !value.trim() || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Compare price must be a valid positive number."
    ),
    categoryId: z.string().min(1, "Please select a category."),
    stock: z.string().trim().min(1, "Stock is required.").refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
      "Stock must be a whole number of zero or more."
    ),
    weight: z.string().trim().min(1, "Weight is required.").refine(
      (value) =>
        WEIGHT_PATTERN.test(value) && Number(value) >= 0 && Number(value) <= 999.99,
      "Weight must be between 0 and 999.99 kg with at most 2 decimal places."
    ),
    status: z.enum(["active", "inactive", "draft", "out_of_stock"]),
    shortDescription: z.string(),
    description: z.string(),
    featured: z.boolean(),
    shopeeUrl: z.string().refine(isHttpUrl, "Enter a valid http or https URL."),
    tokopediaUrl: z.string().refine(isHttpUrl, "Enter a valid http or https URL."),
    tiktokShopUrl: z.string().refine(isHttpUrl, "Enter a valid http or https URL."),
    lazadaUrl: z.string().refine(isHttpUrl, "Enter a valid http or https URL."),
    blibliUrl: z.string().refine(isHttpUrl, "Enter a valid http or https URL."),
  })
  .superRefine((values, context) => {
    if (
      values.comparePrice.trim() &&
      Number(values.comparePrice) < Number(values.price)
    ) {
      context.addIssue({
        code: "custom",
        path: ["comparePrice"],
        message: "Compare price should be greater than or equal to the price.",
      });
    }
  });

/**
 * Validates the Add/Edit Product form and returns friendly, field-level
 * messages. Returns an empty object when the form is valid.
 */
export function validateProductForm(
  values: Omit<ProductFormValues, "images" | "newArrivalThumbnail">
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const result = productFormSchema.safeParse(values);
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field as keyof ProductFormValues]) {
      errors[field as keyof ProductFormValues] = issue.message;
    }
  }
  return errors;
}
