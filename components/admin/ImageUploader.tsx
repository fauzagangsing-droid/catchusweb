"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
  deleteStorageImage,
  getImagePathFromPublicUrl,
  uploadProductImage,
  validateImageFile,
  type CancellableUpload,
} from "@/lib/storage";
import type { ProductImagesFieldValue, RemovedProductImage } from "@/lib/admin-products";
import type { ProductImage } from "@/types/database";
import styles from "./ImageUploader.module.css";

const MAX_PRODUCT_IMAGES = 8;

export interface ImageUploaderProps {
  productId: string;
  initialImages: ProductImage[];
  disabled?: boolean;
  storage?: ImageUploaderStorage;
  onChange: (value: ProductImagesFieldValue) => void;
}

export interface ImageUploaderStorage {
  upload: (ownerId: string, file: File, onProgress: (percent: number) => void) => CancellableUpload;
  remove: (path: string) => Promise<void>;
  getPathFromPublicUrl: (url: string) => string | null;
}

const productImageStorage: ImageUploaderStorage = {
  upload: uploadProductImage,
  remove: deleteStorageImage,
  getPathFromPublicUrl: getImagePathFromPublicUrl,
};

type ManagedImage = {
  clientId: string;
  id: string | null;
  url: string;
  storagePath: string | null;
  isThumbnail: boolean;
  isNew: boolean;
  status: "ready" | "uploading" | "error";
  progress: number;
  error: string | null;
};

function makeInitialImages(images: ProductImage[]): ManagedImage[] {
  const hasThumbnail = images.some((image) => image.is_thumbnail);
  return images.map((image, index) => ({
    clientId: image.id,
    id: image.id,
    url: image.image_url,
    storagePath: null,
    isThumbnail: hasThumbnail ? image.is_thumbnail : index === 0,
    isNew: false,
    status: "ready",
    progress: 100,
    error: null,
  }));
}

export default function ImageUploader({
  productId,
  initialImages,
  disabled,
  storage = productImageStorage,
  onChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState<ManagedImage[]>(() => makeInitialImages(initialImages));
  const [removedImages, setRemovedImages] = useState<RemovedProductImage[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef(new Map<string, CancellableUpload>());
  const imagesRef = useRef(images);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const resolvedValue = useMemo<ProductImagesFieldValue>(
    () => ({
      productId,
      images: images
        .filter((image) => image.status === "ready")
        .map((image) => ({
          id: image.id,
          imageUrl: image.url,
          isThumbnail: image.isThumbnail,
          storagePath: image.storagePath,
        })),
      removedImages,
      uploading: images.some((image) => image.status === "uploading"),
    }),
    [images, productId, removedImages]
  );

  useEffect(() => {
    onChange(resolvedValue);
  }, [onChange, resolvedValue]);

  useEffect(() => {
    const activeUploads = uploadsRef.current;
    return () => {
      activeUploads.forEach((upload) => upload.cancel());
      if (disabledRef.current) return;
      imagesRef.current.forEach((image) => {
        if (image.isNew && image.storagePath) void storage.remove(image.storagePath);
      });
    };
  }, [storage]);

  const uploadFiles = (fileList: FileList | File[]) => {
    if (disabled) return;

    const files = Array.from(fileList);
    const availableSlots = MAX_PRODUCT_IMAGES - images.length;
    if (availableSlots <= 0) {
      setGeneralError(`You can upload up to ${MAX_PRODUCT_IMAGES} product images.`);
      return;
    }

    const selected = files.slice(0, availableSlots);
    const invalid = selected.find((file) => validateImageFile(file));
    if (invalid) {
      setGeneralError(`${invalid.name}: ${validateImageFile(invalid)}`);
      return;
    }
    if (files.length > availableSlots) {
      setGeneralError(`Only ${availableSlots} more image${availableSlots === 1 ? "" : "s"} can be added.`);
    } else {
      setGeneralError(null);
    }

    selected.forEach((file) => {
      const clientId = crypto.randomUUID();
      const localUrl = URL.createObjectURL(file);
      const item: ManagedImage = {
        clientId,
        id: null,
        url: localUrl,
        storagePath: null,
        isThumbnail: images.length === 0,
        isNew: true,
        status: "uploading",
        progress: 0,
        error: null,
      };

      setImages((current) => [
        ...current,
        { ...item, isThumbnail: !current.some((image) => image.isThumbnail) },
      ]);

      const upload = storage.upload(productId, file, (progress) => {
        setImages((current) =>
          current.map((image) => (image.clientId === clientId ? { ...image, progress } : image))
        );
      });
      uploadsRef.current.set(clientId, upload);

      upload.promise
        .then(({ path, publicUrl }) => {
          URL.revokeObjectURL(localUrl);
          uploadsRef.current.delete(clientId);
          setImages((current) => {
            const next = current.map((image) =>
              image.clientId === clientId
                ? { ...image, url: publicUrl, storagePath: path, status: "ready" as const, progress: 100 }
                : image
            );
            if (!next.some((image) => image.isThumbnail && image.status === "ready")) {
              return next.map((image) =>
                image.clientId === clientId ? { ...image, isThumbnail: true } : image
              );
            }
            return next;
          });
        })
        .catch((error: unknown) => {
          URL.revokeObjectURL(localUrl);
          uploadsRef.current.delete(clientId);
          setGeneralError(error instanceof Error ? error.message : "Upload failed. Please try again.");
          setImages((current) => {
            const failed = current.find((image) => image.clientId === clientId);
            const next = current.filter((image) => image.clientId !== clientId);
            if (failed?.isThumbnail && next.length > 0 && !next.some((image) => image.isThumbnail)) {
              return next.map((image, index) => ({ ...image, isThumbnail: index === 0 }));
            }
            return next;
          });
        });
    });
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) uploadFiles(event.target.files);
    event.target.value = "";
  };

  const removeImage = (image: ManagedImage) => {
    if (disabled) return;

    if (image.status === "uploading") uploadsRef.current.get(image.clientId)?.cancel();
    if (image.isNew && image.storagePath) void storage.remove(image.storagePath);
    if (!image.isNew && image.id) {
      setRemovedImages((current) => [
        ...current,
        { id: image.id as string, storagePath: storage.getPathFromPublicUrl(image.url) },
      ]);
    }

    setImages((current) => {
      const next = current.filter((item) => item.clientId !== image.clientId);
      if (image.isThumbnail && next.length > 0) {
        const firstReady = next.find((item) => item.status === "ready") ?? next[0];
        return next.map((item) => ({ ...item, isThumbnail: item.clientId === firstReady.clientId }));
      }
      return next;
    });
  };

  const setThumbnail = (clientId: string) => {
    setImages((current) =>
      current.map((image) => ({ ...image, isThumbnail: image.clientId === clientId }))
    );
  };

  const uploading = images.some((image) => image.status === "uploading");
  const canAdd = images.length < MAX_PRODUCT_IMAGES && !disabled;

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <div>
          <span className={styles.label}>Product Images</span>
          <span className={styles.hint}>Choose one thumbnail and add up to {MAX_PRODUCT_IMAGES - 1} gallery images.</span>
        </div>
        <span className={styles.counter}>{images.length}/{MAX_PRODUCT_IMAGES}</span>
      </div>

      <div
        className={`${styles.dropzone} ${dropActive ? styles.dragActive : ""} ${!canAdd ? styles.disabled : ""}`}
        onClick={() => canAdd && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && canAdd) inputRef.current?.click();
        }}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          if (canAdd) setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDropActive(false);
          if (canAdd) uploadFiles(event.dataTransfer.files);
        }}
        role="button"
        tabIndex={canAdd ? 0 : -1}
        aria-disabled={!canAdd}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
          className={styles.hiddenInput}
          onChange={handleInputChange}
          disabled={!canAdd}
        />
        <i className={`ri-upload-cloud-2-line ${styles.emptyIcon}`} />
        <span className={styles.emptyTitle}>Drag images here, or click to browse</span>
        <span className={styles.emptyHint}>JPG, JPEG, PNG or WEBP · max 5 MB each</span>
      </div>

      {generalError && <span className={styles.fieldError}>{generalError}</span>}

      {images.length > 0 && (
        <div className={styles.gallery}>
          {images.map((image) => (
            <div key={image.clientId} className={styles.imageCard}>
              <div className={styles.previewWrap}>
                <Image
                  src={image.url}
                  alt="Product gallery preview"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 180px"
                  className={styles.previewImg}
                />
                {image.status === "uploading" && (
                  <div className={styles.uploadingOverlay}>
                    <span className={styles.spinner} />
                    <span>{image.progress}%</span>
                  </div>
                )}
                {image.isThumbnail && image.status === "ready" && (
                  <span className={styles.thumbnailBadge}>Thumbnail</span>
                )}
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeImage(image)}
                  disabled={disabled}
                  aria-label="Remove image"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
              {image.status === "error" ? (
                <span className={styles.imageError}>{image.error}</span>
              ) : (
                <button
                  type="button"
                  className={`${styles.thumbnailBtn} ${image.isThumbnail ? styles.thumbnailBtnActive : ""}`}
                  onClick={() => setThumbnail(image.clientId)}
                  disabled={disabled || image.status !== "ready"}
                >
                  <i className={image.isThumbnail ? "ri-star-fill" : "ri-star-line"} />
                  {image.isThumbnail ? "Main image" : "Set as thumbnail"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <span className={styles.hint}>
        {uploading ? "Wait for all uploads to finish before saving." : `Accepted: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}. Max ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)} MB per image.`}
      </span>
    </div>
  );
}
