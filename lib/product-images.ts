"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { ProductImage } from "@/types/database";

/**
 * product_images row CRUD, used exclusively by the Product Image Upload
 * feature. Deliberately separate from lib/admin-products.ts so the existing
 * Product CRUD (createProduct/updateProduct/deleteProduct) is reused as-is
 * and never touched by this feature.
 */

export interface ImageQueryResult<T> {
  data: T | null;
  error: string | null;
}

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to do that. Please sign in again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return "Something went wrong saving the product image. Please try again.";
}

/**
 * Saves the single thumbnail image row for a product: updates the existing
 * row when `existingImageId` is given, otherwise inserts a new one. Mirrors
 * the "one thumbnail per product" constraint already enforced by
 * uq_one_thumbnail_per_product in supabase/schema.sql.
 */
export async function saveProductImage(
  productId: string,
  imageUrl: string,
  existingImageId: string | null
): Promise<ImageQueryResult<ProductImage>> {
  if (existingImageId) {
    const { data, error } = await supabaseBrowser
      .from("product_images")
      .update({ image_url: imageUrl })
      .eq("id", existingImageId)
      .select("*")
      .single();

    if (error) return { data: null, error: toFriendlyError(error.message) };
    return { data, error: null };
  }

  const { data, error } = await supabaseBrowser
    .from("product_images")
    .insert({ product_id: productId, image_url: imageUrl, is_thumbnail: true })
    .select("*")
    .single();

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data, error: null };
}

export async function deleteProductImageRow(imageId: string): Promise<ImageQueryResult<true>> {
  const { error } = await supabaseBrowser.from("product_images").delete().eq("id", imageId);

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: true, error: null };
}
