"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { ProductImagesFieldValue } from "@/lib/admin-products";
import type { ProductImage } from "@/types/database";

export interface ImageQueryResult<T> {
  data: T | null;
  error: string | null;
}

function toFriendlyError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to update product images. Please sign in again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server while saving product images.";
  }
  return "Something went wrong saving the product images. Please try again.";
}

/** Reconciles the gallery after the product row is saved. */
export async function syncProductImages(
  productId: string,
  value: ProductImagesFieldValue
): Promise<ImageQueryResult<ProductImage[]>> {
  // Clear first so promoting a new thumbnail cannot violate the partial
  // unique index that permits only one thumbnail per product.
  const { error: clearError } = await supabaseBrowser
    .from("product_images")
    .update({ is_thumbnail: false })
    .eq("product_id", productId);

  if (clearError) return { data: null, error: toFriendlyError(clearError.message) };

  const removedIds = value.removedImages.map((image) => image.id);
  if (removedIds.length > 0) {
    const { error } = await supabaseBrowser.from("product_images").delete().in("id", removedIds);
    if (error) return { data: null, error: toFriendlyError(error.message) };
  }

  const { data: existingRows, error: existingError } = await supabaseBrowser
    .from("product_images")
    .select("*")
    .eq("product_id", productId);

  if (existingError) return { data: null, error: toFriendlyError(existingError.message) };

  // Matching by the immutable public URL makes retries safe if an earlier
  // attempt inserted gallery rows but failed while assigning the thumbnail.
  const existingUrls = new Set((existingRows ?? []).map((image) => image.image_url));
  const newImages = value.images.filter(
    (image) => !image.id && !existingUrls.has(image.imageUrl)
  );
  let inserted: ProductImage[] = [];

  if (newImages.length > 0) {
    const { data, error } = await supabaseBrowser
      .from("product_images")
      .insert(
        newImages.map((image) => ({
          product_id: productId,
          image_url: image.imageUrl,
          is_thumbnail: false,
        }))
      )
      .select("*");

    if (error) return { data: null, error: toFriendlyError(error.message) };
    inserted = data ?? [];
  }

  const thumbnail = value.images.find((image) => image.isThumbnail);
  if (thumbnail) {
    const thumbnailId =
      thumbnail.id ??
      inserted.find((image) => image.image_url === thumbnail.imageUrl)?.id ??
      (existingRows ?? []).find((image) => image.image_url === thumbnail.imageUrl)?.id;

    if (!thumbnailId) {
      return { data: null, error: "The thumbnail could not be saved. Please try again." };
    }

    const { error } = await supabaseBrowser
      .from("product_images")
      .update({ is_thumbnail: true })
      .eq("id", thumbnailId);

    if (error) return { data: null, error: toFriendlyError(error.message) };
  }

  const { data, error } = await supabaseBrowser
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: toFriendlyError(error.message) };
  return { data: data ?? [], error: null };
}
