"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from "react";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
  deleteStorageImage,
  getImagePathFromPublicUrl,
  uploadProductImage,
  validateImageFile,
  type CancellableUpload,
} from "@/lib/storage";
import type { ProductImageFieldValue } from "@/lib/admin-products";
import styles from "./ImageUploader.module.css";

export interface ImageUploaderProps {
  /** Client-generated id for a new product, or the existing product's id when editing. */
  productId: string;
  /** The product's currently saved image, if any (Edit mode with an existing image). */
  initialImage: { id: string; url: string } | null;
  /** True while the parent form is submitting — disables all interaction. */
  disabled?: boolean;
  storage?: ImageUploaderStorage;
  label?: string;
  imageAlt?: string;
  onChange: (value: ImageUploaderResolvedValue) => void;
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

export interface ImageUploaderResolvedValue extends ProductImageFieldValue {
  uploading: boolean;
}

type ImageSource =
  | { kind: "none" }
  | { kind: "existing"; url: string }
  | { kind: "uploading"; localUrl: string }
  | { kind: "uploaded"; url: string; path: string };

function resolveValue(
  productId: string,
  initialImage: { id: string; url: string } | null,
  source: ImageSource
): ImageUploaderResolvedValue {
  const imageId = initialImage?.id ?? null;

  if (source.kind === "uploading") {
    return { productId, imageId, imageUrl: null, storagePathToDeleteOnSave: null, uploading: true };
  }
  if (source.kind === "existing") {
    return { productId, imageId, imageUrl: source.url, storagePathToDeleteOnSave: null, uploading: false };
  }
  if (source.kind === "uploaded") {
    const previousPath = initialImage ? getImagePathFromPublicUrl(initialImage.url) : null;
    return { productId, imageId, imageUrl: source.url, storagePathToDeleteOnSave: previousPath, uploading: false };
  }
  // "none" — image was removed
  const previousPath = initialImage ? getImagePathFromPublicUrl(initialImage.url) : null;
  return { productId, imageId, imageUrl: null, storagePathToDeleteOnSave: previousPath, uploading: false };
}

export default function ImageUploader({
  productId,
  initialImage,
  disabled,
  storage = productImageStorage,
  label = "Product Image",
  imageAlt = "Product preview",
  onChange,
}: ImageUploaderProps) {
  const [source, setSource] = useState<ImageSource>(
    initialImage ? { kind: "existing", url: initialImage.url } : { kind: "none" }
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [justSucceeded, setJustSucceeded] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const sourceRef = useRef(source);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  // Purge an uploaded-but-never-saved file if this component unmounts
  // (modal closed/cancelled) while `disabled` (submitting) is false — i.e.
  // the parent never actually persisted this upload. `disabledRef` reflects
  // the last real render, so a successful save (which keeps `disabled` true
  // right up to unmount) is never mistaken for a cancel.
  useEffect(() => {
    return () => {
      if (disabledRef.current) return;
      const current = sourceRef.current;
      if (current.kind === "uploading") {
        cancelRef.current?.();
      } else if (current.kind === "uploaded") {
        void deleteStorageImage(current.path);
      }
    };
  }, []);

  const emit = (next: ImageSource) => {
    setSource(next);
    onChange(resolveValue(productId, initialImage, next));
  };

  const handleFile = (file: File) => {
    if (disabled) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setJustSucceeded(false);
    setProgress(0);

    // Replacing an upload from *this session* that was never saved — safe to delete immediately.
    if (source.kind === "uploaded") {
      void deleteStorageImage(source.path);
    }

    const previousSettled = source;
    const localUrl = URL.createObjectURL(file);
    emit({ kind: "uploading", localUrl });

    const upload: CancellableUpload = uploadProductImage(productId, file, setProgress);
    cancelRef.current = upload.cancel;

    upload.promise
      .then((result) => {
        URL.revokeObjectURL(localUrl);
        emit({ kind: "uploaded", url: result.publicUrl, path: result.path });
        setJustSucceeded(true);
        window.setTimeout(() => setJustSucceeded(false), 1600);
      })
      .catch((err: unknown) => {
        URL.revokeObjectURL(localUrl);
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
        emit(previousSettled);
      });
  };

  const openFilePicker = () => {
    if (disabled || source.kind === "uploading") return;
    fileInputRef.current?.click();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (file) handleFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled || source.kind === "uploading") return;
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled || source.kind === "uploading") return;
    setDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleRemove = (event: MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;

    if (source.kind === "uploading") {
      cancelRef.current?.();
      return; // the rejected promise's .catch handles reverting state
    }
    if (source.kind === "uploaded") {
      void deleteStorageImage(source.path); // never saved — safe to purge now
    }
    setError(null);
    emit({ kind: "none" });
  };

  const previewUrl =
    source.kind === "uploading" ? source.localUrl : source.kind === "existing" || source.kind === "uploaded" ? source.url : null;

  const isUploading = source.kind === "uploading";
  const isDisabled = Boolean(disabled);

  return (
    <div className={styles.field}>
      <label className={styles.label}>Product Image</label>

      <div
        className={[
          styles.dropzone,
          dragActive ? styles.dragActive : "",
          error ? styles.hasError : "",
          isDisabled ? styles.disabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        aria-label={previewUrl ? "Replace product image" : "Upload product image"}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          className={styles.hiddenInput}
          onChange={onInputChange}
          disabled={isDisabled}
        />

        {previewUrl ? (
          <div className={styles.previewWrap}>
            <Image
              src={previewUrl}
              alt={imageAlt}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 320px"
              className={styles.previewImg}
            />

            {justSucceeded && (
              <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>
                <i className="ri-checkbox-circle-fill" /> Uploaded
              </span>
            )}

            {isUploading && (
              <div className={styles.uploadingOverlay}>
                <span className={styles.spinner} aria-hidden="true" />
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressLabel}>Uploading… {progress}%</span>
              </div>
            )}

            {!isUploading && (
              <div className={styles.previewOverlay}>
                <button
                  type="button"
                  className={`${styles.overlayBtn} ${styles.replaceBtn}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openFilePicker();
                  }}
                  disabled={isDisabled}
                >
                  <i className="ri-refresh-line" /> Replace
                </button>
                <button
                  type="button"
                  className={`${styles.overlayBtn} ${styles.removeBtn}`}
                  onClick={handleRemove}
                  disabled={isDisabled}
                >
                  <i className="ri-delete-bin-line" /> Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className={`ri-upload-cloud-2-line ${styles.emptyIcon}`} />
            <span className={styles.emptyTitle}>Drag & drop an image, or click to upload</span>
            <span className={styles.emptyHint}>JPG, JPEG, PNG or WEBP — up to 5 MB</span>
          </div>
        )}
      </div>

      {error && (
        <span className={styles.fieldError}>
          <i className="ri-error-warning-line" /> {error}
        </span>
      )}
      {!error && (
        <span className={styles.hint}>
          Max {Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))} MB. Accepted:{" "}
          {ALLOWED_IMAGE_EXTENSIONS.join(", ")}.
        </span>
      )}
    </div>
  );
}
