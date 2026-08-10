"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { validateBannerVideoFile, validateImageFile } from "@/lib/storage";
import type { Banner } from "@/types/database";
import styles from "./BannerForm.module.css";

export interface BannerFormValues {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  desktopVideoUrl: string | null;
  mobileVideoUrl: string | null;
  desktopImageFile: File | null;
  mobileImageFile: File | null;
  desktopVideoFile: File | null;
  mobileVideoFile: File | null;
  isActive: boolean;
  displayOrder: number;
}

export interface BannerUploadProgress {
  desktopImage: number | null;
  mobileImage: number | null;
  desktopVideo: number | null;
  mobileVideo: number | null;
}

interface BannerFormProps {
  initialBanner: Banner | null;
  submitting: boolean;
  serverError: string | null;
  uploadProgress: BannerUploadProgress;
  onSubmit: (values: BannerFormValues) => void;
  onCancel: () => void;
}

type FormErrors = Partial<Record<
  | "title"
  | "desktopMedia"
  | "desktopImage"
  | "mobileImage"
  | "desktopVideo"
  | "mobileVideo"
  | "buttonText"
  | "buttonUrl"
  | "displayOrder",
  string
>>;

function isAllowedButtonUrl(value: string): boolean {
  return /^(https?:\/\/|\/|#)/i.test(value);
}

export default function BannerForm({
  initialBanner,
  submitting,
  serverError,
  uploadProgress,
  onSubmit,
  onCancel,
}: BannerFormProps) {
  const [title, setTitle] = useState(initialBanner?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialBanner?.subtitle ?? "");
  const [buttonText, setButtonText] = useState(initialBanner?.button_text ?? "");
  const [buttonUrl, setButtonUrl] = useState(initialBanner?.button_url ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    String(initialBanner?.display_order ?? 0)
  );
  const [isActive, setIsActive] = useState(initialBanner?.is_active ?? true);
  const [desktopImageUrl, setDesktopImageUrl] = useState<string | null>(
    initialBanner?.desktop_image_url ?? null
  );
  const [mobileImageUrl, setMobileImageUrl] = useState<string | null>(
    initialBanner?.mobile_image_url ?? null
  );
  const [desktopVideoUrl, setDesktopVideoUrl] = useState<string | null>(
    initialBanner?.desktop_video_url ?? null
  );
  const [mobileVideoUrl, setMobileVideoUrl] = useState<string | null>(
    initialBanner?.mobile_video_url ?? null
  );
  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [desktopVideoFile, setDesktopVideoFile] = useState<File | null>(null);
  const [mobileVideoFile, setMobileVideoFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(desktopImageUrl);
  const [mobilePreview, setMobilePreview] = useState<string | null>(mobileImageUrl);
  const [desktopVideoPreview, setDesktopVideoPreview] = useState<string | null>(desktopVideoUrl);
  const [mobileVideoPreview, setMobileVideoPreview] = useState<string | null>(mobileVideoUrl);
  const [errors, setErrors] = useState<FormErrors>({});
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const selectImage = (
    kind: "desktop" | "mobile",
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setErrors((current) => ({
        ...current,
        [kind === "desktop" ? "desktopImage" : "mobileImage"]: validationError,
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);

    if (kind === "desktop") {
      setDesktopImageFile(file);
      setDesktopPreview(previewUrl);
      setErrors((current) => ({ ...current, desktopImage: undefined, desktopMedia: undefined }));
    } else {
      setMobileImageFile(file);
      setMobilePreview(previewUrl);
      setErrors((current) => ({ ...current, mobileImage: undefined }));
    }
  };

  const selectVideo = (
    kind: "desktop" | "mobile",
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateBannerVideoFile(file);
    if (validationError) {
      setErrors((current) => ({
        ...current,
        [kind === "desktop" ? "desktopVideo" : "mobileVideo"]: validationError,
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);

    if (kind === "desktop") {
      setDesktopVideoFile(file);
      setDesktopVideoPreview(previewUrl);
      setErrors((current) => ({ ...current, desktopVideo: undefined, desktopMedia: undefined }));
    } else {
      setMobileVideoFile(file);
      setMobileVideoPreview(previewUrl);
      setErrors((current) => ({ ...current, mobileVideo: undefined }));
    }
  };

  const removeImage = (kind: "desktop" | "mobile") => {
    if (kind === "desktop") {
      setDesktopImageFile(null);
      setDesktopImageUrl(null);
      setDesktopPreview(null);
    } else {
      setMobileImageFile(null);
      setMobileImageUrl(null);
      setMobilePreview(null);
      setErrors((current) => ({ ...current, mobileImage: undefined }));
    }
  };

  const removeVideo = (kind: "desktop" | "mobile") => {
    if (kind === "desktop") {
      setDesktopVideoFile(null);
      setDesktopVideoUrl(null);
      setDesktopVideoPreview(null);
    } else {
      setMobileVideoFile(null);
      setMobileVideoUrl(null);
      setMobileVideoPreview(null);
      setErrors((current) => ({ ...current, mobileVideo: undefined }));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const normalizedTitle = title.trim();
    const normalizedButtonText = buttonText.trim();
    const normalizedButtonUrl = buttonUrl.trim();
    const parsedOrder = Number(displayOrder);

    if (!normalizedTitle) nextErrors.title = "Title is required.";
    if (!desktopImageFile && !desktopImageUrl && !desktopVideoFile && !desktopVideoUrl) {
      nextErrors.desktopMedia = "Add a desktop image or video.";
    }
    if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
      nextErrors.displayOrder = "Display order must be a whole number of 0 or greater.";
    }
    if (Boolean(normalizedButtonText) !== Boolean(normalizedButtonUrl)) {
      nextErrors.buttonText = "Button text and URL must be filled together.";
      nextErrors.buttonUrl = "Button text and URL must be filled together.";
    } else if (normalizedButtonUrl && !isAllowedButtonUrl(normalizedButtonUrl)) {
      nextErrors.buttonUrl = "Use an https:// URL, /path, or #section link.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      title: normalizedTitle,
      subtitle: subtitle.trim(),
      buttonText: normalizedButtonText,
      buttonUrl: normalizedButtonUrl,
      desktopImageUrl,
      mobileImageUrl,
      desktopVideoUrl,
      mobileVideoUrl,
      desktopImageFile,
      mobileImageFile,
      desktopVideoFile,
      mobileVideoFile,
      isActive,
      displayOrder: parsedOrder,
    });
  };

  const renderImageField = (
    kind: "desktop" | "mobile",
    label: string,
    hint: string,
    preview: string | null
  ) => {
    const inputId = `banner-${kind}-image`;
    const progress = uploadProgress[kind === "desktop" ? "desktopImage" : "mobileImage"];
    const error = errors[kind === "desktop" ? "desktopImage" : "mobileImage"];

    return (
      <div className={styles.imageField}>
        <div className={styles.imageLabelRow}>
          <div>
            <label className={styles.label} htmlFor={inputId}>{label}</label>
            <span className={styles.hint}>{hint}</span>
          </div>
          {preview && (
            <button
              type="button"
              className={styles.removeImageBtn}
              onClick={() => removeImage(kind)}
              disabled={submitting}
            >
              Remove
            </button>
          )}
        </div>

        <label className={styles.imagePicker} htmlFor={inputId}>
          {preview ? (
            // Banner URLs can be local previews or Supabase public URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${label} preview`} />
          ) : (
            <span className={styles.emptyImage}>
              <i className="ri-image-add-line" />
              Choose an image
            </span>
          )}
          {progress !== null && (
            <span className={styles.uploadOverlay}>Uploading {progress}%</span>
          )}
        </label>
        <input
          id={inputId}
          className={styles.hiddenInput}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(event) => selectImage(kind, event)}
          disabled={submitting}
        />
        {error && <span className={styles.fieldError}>{error}</span>}
      </div>
    );
  };

  const renderVideoField = (
    kind: "desktop" | "mobile",
    label: string,
    hint: string,
    preview: string | null
  ) => {
    const inputId = `banner-${kind}-video`;
    const progress = uploadProgress[kind === "desktop" ? "desktopVideo" : "mobileVideo"];
    const error = errors[kind === "desktop" ? "desktopVideo" : "mobileVideo"];

    return (
      <div className={styles.imageField}>
        <div className={styles.imageLabelRow}>
          <div>
            <label className={styles.label} htmlFor={inputId}>{label}</label>
            <span className={styles.hint}>{hint}</span>
          </div>
          {preview && (
            <button type="button" className={styles.removeImageBtn} onClick={() => removeVideo(kind)} disabled={submitting}>
              Remove
            </button>
          )}
        </div>

        <label className={styles.imagePicker} htmlFor={inputId}>
          {preview ? (
            <video src={preview} muted playsInline preload="metadata" />
          ) : (
            <span className={styles.emptyImage}>
              <i className="ri-video-add-line" />
              Choose a video
            </span>
          )}
          {progress !== null && <span className={styles.uploadOverlay}>Uploading {progress}%</span>}
        </label>
        <input
          id={inputId}
          className={styles.hiddenInput}
          type="file"
          accept=".mp4,.webm"
          onChange={(event) => selectVideo(kind, event)}
          disabled={submitting}
        />
        {error && <span className={styles.fieldError}>{error}</span>}
      </div>
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className={styles.errorBox} role="alert">
          <i className="ri-error-warning-line" />
          <span>{serverError}</span>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Campaign content</h3>
          <p>Text and destination layered over the homepage campaign media.</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="banner-title">Title</label>
            <input id="banner-title" className={styles.input} value={title} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: undefined })); }} maxLength={160} disabled={submitting} aria-invalid={Boolean(errors.title)} />
            {errors.title && <span className={styles.fieldError}>{errors.title}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="banner-subtitle">Subtitle</label>
            <textarea id="banner-subtitle" className={styles.textarea} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} rows={4} maxLength={500} disabled={submitting} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="banner-button-text">Button text</label>
              <input id="banner-button-text" className={styles.input} value={buttonText} onChange={(event) => { setButtonText(event.target.value); setErrors((current) => ({ ...current, buttonText: undefined, buttonUrl: undefined })); }} maxLength={60} disabled={submitting} aria-invalid={Boolean(errors.buttonText)} />
              {errors.buttonText && <span className={styles.fieldError}>{errors.buttonText}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="banner-button-url">Button URL</label>
              <input id="banner-button-url" className={styles.input} value={buttonUrl} onChange={(event) => { setButtonUrl(event.target.value); setErrors((current) => ({ ...current, buttonText: undefined, buttonUrl: undefined })); }} placeholder="#produk" disabled={submitting} aria-invalid={Boolean(errors.buttonUrl)} />
              {errors.buttonUrl && <span className={styles.fieldError}>{errors.buttonUrl}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Campaign media</h3>
          <p>Add a desktop image or video. Mobile media is optional and falls back to desktop.</p>
        </div>
        <div className={`${styles.sectionBody} ${styles.imageGrid}`}>
          {errors.desktopMedia && <div className={styles.mediaError} role="alert">{errors.desktopMedia}</div>}
          {renderImageField("desktop", "Desktop image", "JPG, PNG or WEBP · max 5 MB", desktopPreview)}
          {renderImageField("mobile", "Mobile image (optional)", "Used at 768px and below", mobilePreview)}
          {renderVideoField("desktop", "Desktop video (optional)", "MP4 or WEBM · max 50 MB · overrides image", desktopVideoPreview)}
          {renderVideoField("mobile", "Mobile video (optional)", "Used at 768px and below", mobileVideoPreview)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Publishing</h3>
          <p>Active campaigns appear publicly in ascending display order.</p>
        </div>
        <div className={`${styles.sectionBody} ${styles.row}`}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="banner-display-order">Display order</label>
            <input id="banner-display-order" type="number" min="0" step="1" className={styles.input} value={displayOrder} onChange={(event) => { setDisplayOrder(event.target.value); setErrors((current) => ({ ...current, displayOrder: undefined })); }} disabled={submitting} aria-invalid={Boolean(errors.displayOrder)} />
            {errors.displayOrder && <span className={styles.fieldError}>{errors.displayOrder}</span>}
          </div>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={submitting} />
            <span>
              <strong>Active</strong>
              <small>Show this campaign on the public homepage.</small>
            </span>
          </label>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting && <span className={styles.spinner} aria-hidden="true" />}
          {submitting ? "Saving..." : initialBanner ? "Save Changes" : "Add Banner"}
        </button>
      </div>
    </form>
  );
}
