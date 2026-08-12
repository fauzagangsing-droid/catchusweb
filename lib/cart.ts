import type { SupabaseClient } from "@supabase/supabase-js";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import type { Database, CartItemWithProduct, ProductSize } from "@/types/database";
import type { CartCountSnapshot, CartData, CartTotals } from "@/types/cart";
import { resolveProductWeightKg } from "@/lib/product-weight";

type CustomerSupabaseClient = SupabaseClient<Database, "public">;

function getClient(client?: CustomerSupabaseClient): CustomerSupabaseClient {
  return client ?? createCustomerBrowserClient();
}

export function friendlyCartError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("authentication required")) {
    return "Silakan masuk untuk mengelola keranjang Anda.";
  }
  if (normalized.includes("exceeds available stock")) {
    return "Jumlah yang diminta melebihi stok yang tersedia.";
  }
  if (normalized.includes("size must be selected")) {
    return "Pilih ukuran produk sebelum menambahkannya ke keranjang.";
  }
  if (normalized.includes("selected size is not available")) {
    return "Ukuran yang dipilih sudah tidak tersedia.";
  }
  if (normalized.includes("product is not available")) {
    return "Produk ini sudah tidak tersedia.";
  }
  if (normalized.includes("cart item is not available")) {
    return "Barang ini sudah tidak tersedia di keranjang.";
  }

  return "Keranjang tidak dapat diperbarui. Silakan coba lagi.";
}

export async function getCartCountSnapshot(
  client?: CustomerSupabaseClient
): Promise<CartCountSnapshot> {
  const supabase = getClient(client);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { cartId: null, itemCount: 0 };

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cartError) throw new Error(cartError.message);
  if (!cart) return { cartId: null, itemCount: 0 };

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("cart_id", cart.id);

  if (itemsError) throw new Error(itemsError.message);

  return {
    cartId: cart.id,
    itemCount: (items ?? []).reduce((total, item) => total + item.quantity, 0),
  };
}

export async function getCart(
  client?: CustomerSupabaseClient
): Promise<CartData | null> {
  const supabase = getClient(client);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) return null;

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cartError) throw new Error(cartError.message);
  if (!cart) return { id: "", items: [] };

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select(
      `
        *,
        product:products (
          *,
          product_images ( * ),
          product_size_inventory ( * )
        )
      `
    )
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return {
    id: cart.id,
    items: (items ?? []) as CartItemWithProduct[],
  };
}

export async function addProductToCart(
  productId: string,
  quantity = 1,
  selectedSize: ProductSize | null = null,
  client?: CustomerSupabaseClient
): Promise<void> {
  const { error } = await getClient(client).rpc("add_cart_item", {
    p_product_id: productId,
    p_quantity: quantity,
    p_selected_size: selectedSize,
  });

  if (error) throw new Error(error.message);
}

export function getCartItemAvailableStock(item: CartItemWithProduct): number {
  if (!item.product) return 0;
  const enabledSizes = item.product.product_size_inventory.filter(
    (size) => size.is_enabled
  );
  if (enabledSizes.length === 0) return item.product.stock;
  if (!item.selected_size) return 0;
  return (
    enabledSizes.find((size) => size.size === item.selected_size)?.stock ?? 0
  );
}

export function isCartItemAvailable(item: CartItemWithProduct): boolean {
  return Boolean(
    item.product && getCartItemAvailableStock(item) >= item.quantity
  );
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
  client?: CustomerSupabaseClient
): Promise<void> {
  const { error } = await getClient(client).rpc("update_cart_item_quantity", {
    p_cart_item_id: cartItemId,
    p_quantity: quantity,
  });

  if (error) throw new Error(error.message);
}

export async function removeCartItem(
  cartItemId: string,
  client?: CustomerSupabaseClient
): Promise<void> {
  const { error } = await getClient(client)
    .from("cart_items")
    .delete()
    .eq("id", cartItemId);

  if (error) throw new Error(error.message);
}

export function calculateCartTotals(items: CartItemWithProduct[]): CartTotals {
  return items.reduce<CartTotals>(
    (totals, item) => {
      const itemSubtotal = item.product ? item.product.price * item.quantity : 0;
      const itemWeight = item.product
        ? resolveProductWeightKg(item.product.weight) * item.quantity
        : 0;
      return {
        itemCount: totals.itemCount + item.quantity,
        subtotal: totals.subtotal + itemSubtotal,
        grandTotal: totals.grandTotal + itemSubtotal,
        totalWeight: totals.totalWeight + itemWeight,
      };
    },
    { itemCount: 0, subtotal: 0, grandTotal: 0, totalWeight: 0 }
  );
}
