export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

const MIME_EXTENSIONS: Record<SupportedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function matches(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function detectImageMime(bytes: Uint8Array): SupportedImageMime | null {
  if (matches(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    matches(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

export async function detectImageFileMime(
  file: Blob
): Promise<SupportedImageMime | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return detectImageMime(header);
}

export function imageExtension(mime: SupportedImageMime): string {
  return MIME_EXTENSIONS[mime];
}
