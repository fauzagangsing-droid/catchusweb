import type { CartItemWithProduct } from "@/types/database";

export interface CartData {
  id: string;
  items: CartItemWithProduct[];
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  grandTotal: number;
  totalWeight: number;
}

export interface CartCountSnapshot {
  cartId: string | null;
  itemCount: number;
}
