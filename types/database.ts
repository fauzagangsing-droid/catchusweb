/**
 * These interfaces mirror supabase/schema.sql exactly (column-for-column).
 * Keep this file and schema.sql in sync manually, or later regenerate with
 * `supabase gen types typescript` once the CLI is wired into the project.
 */

export type ProductStatus = "active" | "inactive" | "draft" | "out_of_stock";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  banner: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  sku: string | null;
  category_id: string | null;
  price: number;
  compare_price: number | null;
  stock: number;
  weight: number | null;
  status: ProductStatus;
  featured: boolean;
  shopee_url: string | null;
  tiktok_url: string | null;
  tokopedia_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_thumbnail: boolean;
  created_at: string;
}

/** A product row joined with its category and images, as returned by lib/queries.ts */
export interface ProductWithRelations extends Product {
  category: Category | null;
  product_images: ProductImage[];
}

/**
 * Insert/Update payload shapes for the Product Management module (Phase 3).
 * Only columns an admin actually supplies are required; anything with a
 * database default (id, timestamps, stock, etc.) is optional so callers
 * don't have to pass values the database already fills in.
 */
export interface ProductInsert {
  /**
   * Optional client-generated id. The column defaults to gen_random_uuid(),
   * but the Product Image Upload feature needs the id *before* the product
   * row exists (to build the Storage path while the Add modal is still
   * open), so it generates one up front and supplies it here on insert.
   */
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  category_id?: string | null;
  price: number;
  compare_price?: number | null;
  stock?: number;
  weight?: number | null;
  status?: ProductStatus;
  featured?: boolean;
  shopee_url?: string | null;
  tiktok_url?: string | null;
  tokopedia_url?: string | null;
}

export type ProductUpdate = Partial<ProductInsert>;

/** Insert/Update payload shapes for the Product Image Upload feature. */
export interface ProductImageInsert {
  product_id: string;
  image_url: string;
  is_thumbnail?: boolean;
}

export type ProductImageUpdate = Partial<ProductImageInsert>;

/**
 * Minimal Supabase Database type so `createClient<Database>()` gives typed
 * `.from("products")` calls. `Row` shapes were the only thing needed while
 * Phase 2 was read-only; `Insert`/`Update` are added here (additively, Row
 * untouched) now that the Product Management module needs typed writes.
 */
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      product_images: {
        Row: ProductImage;
        Insert: ProductImageInsert;
        Update: ProductImageUpdate;
      };
    };
  };
}
