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
 * Minimal Supabase Database type so `createClient<Database>()` gives typed
 * `.from("products")` calls. Only `Row` shapes are defined since Phase 2
 * is read-only (no insert/update payloads needed yet).
 */
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
      };
      products: {
        Row: Product;
      };
      product_images: {
        Row: ProductImage;
      };
    };
  };
}
