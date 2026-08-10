/**
 * Application-facing types for the Supabase tables and RPCs used by this
 * project. Keep them aligned with the SQL files under `supabase/`, or later
 * regenerate them with `supabase gen types typescript` once the CLI is wired
 * into the project.
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

export type WebsiteSettings = {
  id: number;
  brand_name: string;
  website_title: string;
  website_description: string;
  logo_url: string | null;
  favicon_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  hero_button_url: string;
  whatsapp: string | null;
  email: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  shopee_url: string | null;
  tokopedia_url: string | null;
  tiktok_shop_url: string | null;
  copyright_text: string;
  updated_at: string;
};

export type WebsiteSettingsInsert = Partial<Omit<WebsiteSettings, "id" | "updated_at">> & {
  id?: number;
  updated_at?: string;
};

export type WebsiteSettingsUpdate = Partial<Omit<WebsiteSettingsInsert, "id">>;

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Omit<ProfileInsert, "id">>;

export type Cart = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type CartInsert = {
  id?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
};

export type CartUpdate = Partial<Omit<CartInsert, "id" | "user_id">>;

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  selected_size: string | null;
  selected_color: string | null;
  created_at: string;
  updated_at: string;
};

export type CartItemInsert = {
  id?: string;
  cart_id: string;
  product_id: string;
  quantity?: number;
  selected_size?: string | null;
  selected_color?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CartItemUpdate = Partial<
  Omit<CartItemInsert, "id" | "cart_id" | "product_id">
>;

export interface CartItemWithProduct extends CartItem {
  product: (Product & { product_images: ProductImage[] }) | null;
}

export type PaymentMethod = "qris" | "dana" | "bank_transfer";
export type ShippingCourier = string;
export type ShippingStatus =
  | "pending"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";
export type PaymentStatus =
  | "pending"
  | "waiting_verification"
  | "paid"
  | "rejected";
export type OrderStatus =
  | "pending_payment"
  | "waiting_verification"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type PaymentSettings = {
  id: number;
  qris_merchant_name: string | null;
  qris_image_url: string | null;
  qris_description: string | null;
  dana_account_name: string | null;
  dana_number: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  shipping_cost: number;
  updated_at: string;
};

export type PaymentSettingsInsert = Partial<Omit<PaymentSettings, "updated_at">> & {
  id?: number;
  updated_at?: string;
};

export type PaymentSettingsUpdate = Partial<
  Omit<PaymentSettingsInsert, "id">
>;

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_address_id: string | null;
  shipping_address_label: string | null;
  shipping_city: string;
  shipping_province: string;
  shipping_district: string | null;
  shipping_village: string | null;
  shipping_postal_code: string;
  province_code: string | null;
  city_code: string | null;
  district_code: string | null;
  destination_village_code: string | null;
  shipping_courier: ShippingCourier | null;
  courier_code: string | null;
  courier_name: string | null;
  shipping_estimation: string | null;
  shipping_weight: number | null;
  shipping_status: ShippingStatus;
  tracking_number: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url: string | null;
  payment_uploaded_at: string | null;
  payment_notes: string | null;
  payment_rejection_reason: string | null;
  voucher_id: string | null;
  voucher_code: string | null;
  discount_amount: number;
  order_status: OrderStatus;
  discord_message_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ShippingAddressLabel = "home" | "office" | "other";

export type ShippingAddress = {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  province_name: string;
  city_name: string;
  district_name: string;
  village_name: string;
  postal_code: string;
  full_address: string;
  label: ShippingAddressLabel;
  province_code: string;
  city_code: string;
  district_code: string;
  village_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type ShippingAddressInsert = Omit<
  ShippingAddress,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ShippingAddressUpdate = Partial<
  Omit<ShippingAddressInsert, "user_id">
>;

export type OrderInsert = Omit<Order, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type OrderUpdate = Partial<
  Omit<OrderInsert, "id" | "order_number" | "user_id">
>;

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string;
  product_image_url: string | null;
  selected_size: string | null;
  selected_color: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type OrderItemInsert = Omit<OrderItem, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type OrderItemUpdate = Partial<
  Omit<OrderItemInsert, "id" | "order_id">
>;

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export type VoucherType = "percentage" | "fixed";

export type Voucher = {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  minimum_purchase: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VoucherInsert = Omit<Voucher, "id" | "used_count" | "created_at" | "updated_at"> & {
  id?: string;
  used_count?: number;
  created_at?: string;
  updated_at?: string;
};
export type VoucherUpdate = Partial<Omit<VoucherInsert, "id">>;

export type VoucherUsage = {
  id: string;
  voucher_id: string;
  order_id: string;
  user_id: string;
  created_at: string;
};

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  review: string;
  images: string[];
  created_at: string;
  updated_at: string;
};

export type ProductReviewInsert = Omit<ProductReview, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type ProductReviewUpdate = Partial<Pick<ProductReview, "rating" | "review" | "images">>;

export type AdminUser = {
  id: string;
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
  desktop_video_url: string | null;
  mobile_video_url: string | null;
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
  desktop_video_url?: string | null;
  mobile_video_url?: string | null;
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
  short_description: string | null;
  description: string | null;
  brand: string | null;
  sku: string | null;
  category_id: string | null;
  price: number;
  compare_price: number | null;
  stock: number;
  weight: number;
  status: ProductStatus;
  featured: boolean;
  shopee_url: string | null;
  tiktok_url: string | null;
  tiktok_shop_url: string | null;
  tokopedia_url: string | null;
  lazada_url: string | null;
  blibli_url: string | null;
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
 * Insert/update payload shapes for the Product Management module.
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
  short_description?: string | null;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  category_id?: string | null;
  price: number;
  compare_price?: number | null;
  stock?: number;
  weight: number;
  status?: ProductStatus;
  featured?: boolean;
  shopee_url?: string | null;
  tiktok_url?: string | null;
  tiktok_shop_url?: string | null;
  tokopedia_url?: string | null;
  lazada_url?: string | null;
  blibli_url?: string | null;
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
      website_settings: {
        Row: WebsiteSettings;
        Insert: WebsiteSettingsInsert;
        Update: WebsiteSettingsUpdate;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      carts: {
        Row: Cart;
        Insert: CartInsert;
        Update: CartUpdate;
        Relationships: [];
      };
      cart_items: {
        Row: CartItem;
        Insert: CartItemInsert;
        Update: CartItemUpdate;
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_settings: {
        Row: PaymentSettings;
        Insert: PaymentSettingsInsert;
        Update: PaymentSettingsUpdate;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: OrderInsert;
        Update: OrderUpdate;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      shipping_addresses: {
        Row: ShippingAddress;
        Insert: ShippingAddressInsert;
        Update: ShippingAddressUpdate;
        Relationships: [];
      };
      vouchers: {
        Row: Voucher;
        Insert: VoucherInsert;
        Update: VoucherUpdate;
        Relationships: [];
      };
      voucher_usages: {
        Row: VoucherUsage;
        Insert: Omit<VoucherUsage, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<VoucherUsage, "id">>;
        Relationships: [];
      };
      product_reviews: {
        Row: ProductReview;
        Insert: ProductReviewInsert;
        Update: ProductReviewUpdate;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUser;
        Insert: { id: string; created_at?: string };
        Update: { created_at?: string };
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
      add_cart_item: {
        Args: { p_product_id: string; p_quantity?: number };
        Returns: CartItem;
      };
      update_cart_item_quantity: {
        Args: { p_cart_item_id: string; p_quantity: number };
        Returns: CartItem;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      place_order_with_shipping: {
        Args: {
          p_user_id: string;
          p_payment_method: PaymentMethod;
          p_address_id: string;
          p_courier_code: string;
          p_courier_name: string;
          p_shipping_cost: number;
          p_shipping_estimation: string | null;
          p_shipping_weight: number;
          p_destination_village_code: string;
          p_voucher_code: string | null;
        };
        Returns: Order;
      };
      mark_order_paid: {
        Args: { p_order_number: string };
        Returns: Order;
      };
      set_order_discord_message_id: {
        Args: { p_order_id: string; p_message_id: string };
        Returns: Order;
      };
      admin_update_order: {
        Args: {
          p_order_id: string;
          p_action:
            | "approve_payment"
            | "reject_payment"
            | "mark_processing"
            | "mark_shipped"
            | "mark_completed"
            | "cancel_order";
          p_rejection_reason: string | null;
        };
        Returns: Order;
      };
      admin_save_order_shipping: {
        Args: {
          p_order_id: string;
          p_tracking_number: string | null;
          p_shipping_status: ShippingStatus;
        };
        Returns: Order;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
