"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCartCountSnapshot } from "@/lib/cart";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";

interface CartContextValue {
  itemCount: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);

export default function CartProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState(0);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    try {
      const snapshot = await getCartCountSnapshot();
      setCartId(snapshot.cartId);
      setItemCount(snapshot.itemCount);
    } catch {
      setCartId(null);
      setItemCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createCustomerBrowserClient();
    void refreshCart();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshCart(), 0);
    });

    return () => listener.subscription.unsubscribe();
  }, [refreshCart]);

  useEffect(() => {
    if (!cartId) return;

    const supabase = createCustomerBrowserClient();
    const channel = supabase
      .channel(`cart-items-${cartId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items" },
        () => void refreshCart()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cartId, refreshCart]);

  const value = useMemo(
    () => ({ itemCount, loading, refreshCart }),
    [itemCount, loading, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
