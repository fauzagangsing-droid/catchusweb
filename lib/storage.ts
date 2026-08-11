"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Shared image Storage helpers for authenticated admin upload features.
 * Kept separate from CRUD services so their existing logic stays untouched.
 */

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const BANNER_IMAGE_BUCKET = "banner-images";
export const PAYMENT_IMAGE_BUCKET = "payment-assets";
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_BANNER_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const ALLOWED_BANNER_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"];
export const ALLOWED_BANNER_VIDEO_EXTENSIONS = ["mp4", "webm"];

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Validates a file against the jpg/jpeg/png/webp + 5 MB rules. Returns a
 * user-facing error message, or null when the file is valid.
 */
export function validateImageFile(file: File): string | null {
  const extension = getExtension(file.name);
  const extensionOk = ALLOWED_IMAGE_EXTENSIONS.includes(extension);
  const mimeOk = ALLOWED_IMAGE_MIME_TYPES.includes(file.type);

  if (!extensionOk || !mimeOk) {
    return "Only JPG, JPEG, PNG, or WEBP images are allowed.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

/** Validates background video uploads for homepage campaigns. */
export function validateBannerVideoFile(file: File): string | null {
  const extension = getExtension(file.name);
  const extensionOk = ALLOWED_BANNER_VIDEO_EXTENSIONS.includes(extension);
  const mimeOk = ALLOWED_BANNER_VIDEO_MIME_TYPES.includes(file.type);

  if (!extensionOk || !mimeOk) {
    return "Only MP4 or WEBM videos are allowed.";
  }
  if (file.size > MAX_BANNER_VIDEO_SIZE_BYTES) {
    return "Video must be 50 MB or smaller.";
  }
  return null;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Builds a unique storage path for a product image: `{productId}/{random}.{ext}` */
export function buildImagePath(productId: string, file: File): string {
  const extension = getExtension(file.name) || "jpg";
  return `${productId}/${randomId()}.${extension}`;
}

export function getPublicImageUrl(path: string, bucket = PRODUCT_IMAGE_BUCKET): string {
  const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Recovers the storage path from a public URL produced by getPublicImageUrl,
 * so a previously-saved image_url from the database can be deleted later.
 * Returns null if the URL doesn't match this bucket's public URL shape.
 */
export function getImagePathFromPublicUrl(url: string, bucket = PRODUCT_IMAGE_BUCKET): string | null {
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  try {
    return decodeURIComponent(url.slice(index + marker.length));
  } catch {
    return url.slice(index + marker.length);
  }
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface CancellableUpload {
  promise: Promise<UploadResult>;
  cancel: () => void;
}

/**
 * Uploads a file to the product-images bucket with real progress reporting.
 * supabase-js's storage .upload() has no progress hook, so this mirrors what
 * the SDK does internally (POST to the Storage REST endpoint with the
 * signed-in admin's access token) using XMLHttpRequest, which does expose
 * upload progress events.
 */
function uploadImage(
  bucket: string,
  ownerId: string,
  file: File,
  onProgress: (percent: number) => void
): CancellableUpload {
  const path = buildImagePath(ownerId, file);
  const xhr = new XMLHttpRequest();

  const promise = (async (): Promise<UploadResult> => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    if (!supabaseUrl || !anonKey) {
      throw new Error("Storage isn't configured. Please contact the site admin.");
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    return new Promise<UploadResult>((resolve, reject) => {
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.setRequestHeader("x-upsert", "true");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve({ path, publicUrl: getPublicImageUrl(path, bucket) });
          return;
        }
        let message = "Upload failed. Please try again.";
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string };
          if (parsed?.message) message = parsed.message;
        } catch {
          // response wasn't JSON — fall back to the default message
        }
        reject(new Error(message));
      };

      xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      xhr.onabort = () => reject(new Error("Upload cancelled."));

      xhr.send(file);
    });
  })();

  return { promise, cancel: () => xhr.abort() };
}

export function uploadProductImage(
  productId: string,
  file: File,
  onProgress: (percent: number) => void
): CancellableUpload {
  return uploadImage(PRODUCT_IMAGE_BUCKET, productId, file, onProgress);
}

/**
 * Uploads the homepage New Arrivals thumbnail into its own namespace inside
 * the existing product-media bucket. It never creates or updates a
 * product_images row, so the catalog thumbnail and gallery remain untouched.
 */
export function uploadNewArrivalImage(
  productId: string,
  file: File,
  onProgress: (percent: number) => void
): CancellableUpload {
  return uploadImage(PRODUCT_IMAGE_BUCKET, `new-arrivals/${productId}`, file, onProgress);
}

/** Uploads a banner image through the same authenticated, progress-aware flow as product images. */
export function uploadBannerImage(
  bannerId: string,
  file: File,
  onProgress: (percent: number) => void
): CancellableUpload {
  return uploadImage(BANNER_IMAGE_BUCKET, bannerId, file, onProgress);
}

/** Uploads a banner video to the existing protected campaign media bucket. */
export function uploadBannerVideo(
  bannerId: string,
  file: File,
  onProgress: (percent: number) => void
): CancellableUpload {
  return uploadImage(BANNER_IMAGE_BUCKET, bannerId, file, onProgress);
}

/** Uploads a QRIS image to the dedicated payment-assets bucket. */
export function uploadPaymentImage(
  paymentId: string,
  file: File,
  onProgress: (percent: number) => void
): CancellableUpload {
  return uploadImage(PAYMENT_IMAGE_BUCKET, paymentId, file, onProgress);
}

/** Best-effort delete — a missing/already-gone file is not treated as an error. */
export async function deleteStorageImage(path: string, bucket = PRODUCT_IMAGE_BUCKET): Promise<void> {
  try {
    await supabaseBrowser.storage.from(bucket).remove([path]);
  } catch {
    // best-effort cleanup; ignore failures so callers never block on it
  }
}
