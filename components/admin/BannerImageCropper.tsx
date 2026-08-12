"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/storage";
import styles from "./BannerImageCropper.module.css";

export type BannerCropKind = "desktop" | "mobile";

interface BannerImageCropperProps {
  file: File;
  kind: BannerCropKind;
  sourceUrl: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

interface Point {
  x: number;
  y: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface CropBox {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  focus: Point;
}

const CROP_CONFIG = {
  desktop: {
    label: "Desktop banner",
    ratioLabel: "16:7",
    aspectRatio: 16 / 7,
    outputWidth: 1920,
    previewWidth: 640,
  },
  mobile: {
    label: "Mobile banner",
    ratioLabel: "2:3",
    aspectRatio: 2 / 3,
    outputWidth: 1080,
    previewWidth: 320,
  },
} as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getCropBox(
  image: ImageDimensions,
  aspectRatio: number,
  zoom: number,
  focus: Point
): CropBox {
  const imageRatio = image.width / image.height;
  const baseWidth = imageRatio > aspectRatio
    ? image.height * aspectRatio
    : image.width;
  const baseHeight = imageRatio > aspectRatio
    ? image.height
    : image.width / aspectRatio;
  const sw = baseWidth / zoom;
  const sh = baseHeight / zoom;
  const centerX = clamp(focus.x * image.width, sw / 2, image.width - sw / 2);
  const centerY = clamp(focus.y * image.height, sh / 2, image.height - sh / 2);

  return {
    sx: centerX - sw / 2,
    sy: centerY - sh / 2,
    sw,
    sh,
    focus: {
      x: centerX / image.width,
      y: centerY / image.height,
    },
  };
}

function drawPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  crop: CropBox,
  outputWidth: number,
  aspectRatio: number
) {
  const outputHeight = Math.round(outputWidth / aspectRatio);
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    outputWidth,
    outputHeight
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The cropped image could not be created.")),
      mimeType,
      quality
    );
  });
}

async function createCroppedFile(
  source: HTMLImageElement,
  originalFile: File,
  crop: CropBox,
  kind: BannerCropKind
): Promise<File> {
  const config = CROP_CONFIG[kind];
  let outputWidth = Math.max(1, Math.min(config.outputWidth, Math.floor(crop.sw)));
  let quality = 0.94;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 9; attempt += 1) {
    const outputHeight = Math.max(1, Math.round(outputWidth / config.aspectRatio));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the crop canvas.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      outputWidth,
      outputHeight
    );
    blob = await canvasToBlob(canvas, originalFile.type, quality);
    if (blob.size <= MAX_IMAGE_SIZE_BYTES) break;
    outputWidth = Math.max(kind === "desktop" ? 960 : 540, Math.round(outputWidth * 0.88));
    if (originalFile.type !== "image/png") quality = Math.max(0.78, quality - 0.04);
  }

  if (!blob || blob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("The cropped image is still larger than 5 MB. Choose a smaller source image.");
  }

  const extension = originalFile.type === "image/png"
    ? "png"
    : originalFile.type === "image/webp"
      ? "webp"
      : "jpg";
  const baseName = originalFile.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}-${kind}-cropped.${extension}`, {
    type: originalFile.type,
    lastModified: Date.now(),
  });
}

export default function BannerImageCropper({
  file,
  kind,
  sourceUrl,
  onCancel,
  onConfirm,
}: BannerImageCropperProps) {
  const config = CROP_CONFIG[kind];
  const imageRef = useRef<HTMLImageElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    focus: Point;
  } | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [cropAreaWidth, setCropAreaWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<Point>({ x: 0.5, y: 0.5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (!saving) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onCancel, saving]);

  const crop = useMemo(
    () => dimensions
      ? getCropBox(dimensions, config.aspectRatio, zoom, focus)
      : null,
    [config.aspectRatio, dimensions, focus, zoom]
  );

  useEffect(() => {
    const cropArea = cropAreaRef.current;
    if (!cropArea) return;
    const updateWidth = () => setCropAreaWidth(cropArea.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(cropArea);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!crop || !previewRef.current || !imageRef.current) return;
    drawPreview(
      previewRef.current,
      imageRef.current,
      crop,
      config.previewWidth,
      config.aspectRatio
    );
  }, [config.aspectRatio, config.previewWidth, crop]);

  const imageStyle = useMemo(() => {
    if (!dimensions || !crop || cropAreaWidth === 0) return undefined;
    const scale = cropAreaWidth / crop.sw;
    return {
      width: dimensions.width * scale,
      height: dimensions.height * scale,
      left: -crop.sx * scale,
      top: -crop.sy * scale,
      maxWidth: "none",
    };
  }, [crop, cropAreaWidth, dimensions]);

  const resetCrop = () => {
    setZoom(1);
    setFocus({ x: 0.5, y: 0.5 });
    setError(null);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!crop || !dimensions || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      focus: crop.focus,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !crop || !dimensions) return;
    const cropArea = cropAreaRef.current;
    if (!cropArea) return;
    const width = cropArea.clientWidth;
    const height = cropArea.clientHeight;
    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;
    const nextFocus = {
      x: drag.focus.x - (deltaX / width) * (crop.sw / dimensions.width),
      y: drag.focus.y - (deltaY / height) * (crop.sh / dimensions.height),
    };
    setFocus(getCropBox(dimensions, config.aspectRatio, zoom, nextFocus).focus);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const confirmCrop = async () => {
    if (!crop || !imageRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const croppedFile = await createCroppedFile(imageRef.current, file, crop, kind);
      onConfirm(croppedFile);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "The crop could not be saved.");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation">
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-crop-title"
      >
        <header className={styles.header}>
          <div>
            <span>{config.label} · {config.ratioLabel}</span>
            <h2 id="banner-crop-title">Adjust image crop</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Cancel crop">
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.editorColumn}>
            <div
              ref={cropAreaRef}
              className={`${styles.cropArea} ${kind === "mobile" ? styles.mobileCrop : styles.desktopCrop}`}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              aria-label="Crop area. Drag the image to reposition it."
            >
              {/* The local object URL is the original selected file. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Original banner crop"
                style={imageStyle}
                draggable={false}
                onLoad={(event) => {
                  setDimensions({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                }}
              />
              <span className={styles.cropGrid} aria-hidden="true" />
              {!dimensions && <span className={styles.loading}>Preparing image…</span>}
            </div>

            <div className={styles.zoomControl}>
              <label htmlFor="banner-crop-zoom">Zoom</label>
              <input
                id="banner-crop-zoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                disabled={!dimensions || saving}
                onChange={(event) => {
                  const nextZoom = Number(event.target.value);
                  setZoom(nextZoom);
                  if (dimensions) {
                    setFocus((current) =>
                      getCropBox(dimensions, config.aspectRatio, nextZoom, current).focus
                    );
                  }
                }}
              />
              <output htmlFor="banner-crop-zoom">{Math.round(zoom * 100)}%</output>
            </div>
            <p className={styles.instructions}>
              Drag to position the important subject inside the crop. Use zoom only when needed.
            </p>
          </div>

          <aside className={styles.previewColumn}>
            <span>Final crop preview</span>
            <canvas
              ref={previewRef}
              className={kind === "mobile" ? styles.mobilePreview : styles.desktopPreview}
              aria-label={`${config.label} final crop preview`}
            />
            <small>
              Saved up to {config.outputWidth} × {Math.round(config.outputWidth / config.aspectRatio)} px,
              without enlarging a smaller source.
            </small>
          </aside>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.actions}>
          <button type="button" className={styles.resetButton} onClick={resetCrop} disabled={saving}>
            Reset
          </button>
          <div>
            <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={() => void confirmCrop()}
              disabled={!dimensions || saving}
            >
              {saving ? "Saving crop…" : "Confirm crop"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
