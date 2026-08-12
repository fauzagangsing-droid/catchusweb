// Previously a fixed union ("sweater" | "t-shirt" | "beanie"). Categories now
// come from the `categories` table in Supabase, so this is a plain string —
// adding a new category in the database no longer requires a code change here.
export type ProductCategory = string;

export interface Product {
  id: string;
  slug: string;
  filter: ProductCategory;
  image: string;
  alt: string;
  badge: string;
  title: string;
  shortDescription: string;
  priceOld: string;
  priceNew: string;
  weight: number;
}
