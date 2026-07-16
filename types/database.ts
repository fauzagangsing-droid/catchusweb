/**
 * These interfaces mirror supabase/schema.sql exactly (column-for-column).
 * Keep this file and schema.sql in sync manually, or later regenerate with
 * `supabase gen types typescript` once the CLI is wired into the project.
 */

export type ProductStatus = "active" | "inactive" | "draft" | "out_of_stock";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  banner: string | null;
  created_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  button_url: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type BannerInsert = {
  id?: string;
  title: string;
  subtitle?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  is_active?: boolean;
  display_order?: number;
};

export type BannerUpdate = Partial<BannerInsert>;

/** Insert/update payloads for the Category Management module. */
export type CategoryInsert = {
  name: string;
  slug: string;
  icon?: string | null;
  banner?: string | null;
};

export type CategoryUpdate = Partial<CategoryInsert>;

export type Product = {
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
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  is_thumbnail: boolean;
  created_at: string;
};

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
export type ProductInsert = {
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
};

export type ProductUpdate = Partial<ProductInsert>;

/** Insert/Update payload shapes for the Product Image Upload feature. */
export type ProductImageInsert = {
  product_id: string;
  image_url: string;
  is_thumbnail?: boolean;
};

export type ProductImageUpdate = Partial<ProductImageInsert>;

/**
 * Supabase Database type so `createClient<Database>()` gives typed
 * `.from("products")` calls (including `.insert()`/`.update()`).
 *
 * IMPORTANT — why every table needs `Relationships` and every schema needs
 * `Views`/`Functions`/`Enums`/`CompositeTypes`:
 *
 * `@supabase/supabase-js` (and the `@supabase/postgrest-js` it wraps)
 * constrains its generics against two internal interfaces:
 *
 *   interface GenericTable {
 *     Row: Record<string, unknown>;
 *     Insert: Record<string, unknown>;
 *     Update: Record<string, unknown>;
 *     Relationships: GenericRelationship[];   // <- was missing here
 *   }
 *   interface GenericSchema {
 *     Tables: Record<string, GenericTable>;
 *     Views: Record<string, GenericView>;      // <- was missing here
 *     Functions: Record<string, GenericFunction>; // <- was missing here
 *   }
 *
 * A schema without `Relationships`, `Views`, or `Functions` structurally
 * fails to extend `GenericSchema`. Separately, TypeScript `interface`
 * declarations do not satisfy `Record<string, unknown>` in this generic
 * constraint even when their declared properties match. The database row and
 * payload shapes above are therefore object type aliases, which do satisfy
 * the constraint without adding an index signature to application data.
 *
 * `createClient<Database>()`'s generic signature resolves the concrete
 * `Schema` type via a conditional check: "does `Database[SchemaName]` extend
 * `GenericSchema`? if yes, use it — if no, fall back". Because our `public`
 * schema failed that check, the fallback branch won, and every table on the
 * client (not just `products`) silently lost its typed Insert/Update/Row
 * shapes for methods further down the query-builder chain. That's why the
 * error surfaced as `insert(...)` receiving `never`: it's a downstream
 * symptom of the schema-level generic resolution failing, not a problem
 * with `ProductInsert` itself (which was fine all along).
 *
 * The object type aliases, real foreign-key `Relationships`, and empty
 * schema-level keys together restore full structural conformance, so
 * TypeScript resolves the real `Insert`/`Update`/`Row` types again.
 */
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: [];
      };
      banners: {
        Row: Banner;
        Insert: BannerInsert;
        Update: BannerUpdate;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      product_images: {
        Row: ProductImage;
        Insert: ProductImageInsert;
        Update: ProductImageUpdate;
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
