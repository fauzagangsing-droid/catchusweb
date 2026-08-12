"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { validateImageFile } from "@/lib/storage";
import type { Campaign } from "@/types/database";
import BannerImageCropper, { type BannerCropKind } from "./BannerImageCropper";
import styles from "./BannerForm.module.css";

export interface CampaignFormValues {
  label: string;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  desktopImageFile: File | null;
  desktopImageUrl: string | null;
  mobileImageFile: File | null;
  mobileImageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface CampaignUploadProgress {
  desktopImage: number | null;
  mobileImage: number | null;
}

interface CampaignFormProps {
  initialCampaign: Campaign | null;
  submitting: boolean;
  serverError: string | null;
  uploadProgress: CampaignUploadProgress;
  onSubmit: (values: CampaignFormValues) => void;
  onCancel: () => void;
}

interface CampaignFormErrors {
  title?: string;
  buttonText?: string;
  buttonUrl?: string;
  desktopImage?: string;
  mobileImage?: string;
  displayOrder?: string;
}

interface PendingCampaignCrop {
  kind: BannerCropKind;
  file: File;
  sourceUrl: string;
}

function isValidDestination(value: string): boolean {
  return /^\/(?!\/)/.test(value) || /^https?:\/\/[^\s]+$/i.test(value);
}

export default function CampaignForm({
  initialCampaign,
  submitting,
  serverError,
  uploadProgress,
  onSubmit,
  onCancel,
}: CampaignFormProps) {
  const legacyDesktopImage = initialCampaign?.desktop_image_url ?? initialCampaign?.image_url ?? null;
  const [label, setLabel] = useState(initialCampaign?.label ?? "");
  const [title, setTitle] = useState(initialCampaign?.title ?? "");
  const [description, setDescription] = useState(initialCampaign?.description ?? "");
  const [buttonText, setButtonText] = useState(initialCampaign?.button_text ?? "EXPLORE");
  const [buttonUrl, setButtonUrl] = useState(initialCampaign?.button_url ?? "/shop");
  const [displayOrder, setDisplayOrder] = useState(String(initialCampaign?.display_order ?? 0));
  const [isActive, setIsActive] = useState(initialCampaign?.is_active ?? true);
  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [desktopImageUrl, setDesktopImageUrl] = useState<string | null>(legacyDesktopImage);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(legacyDesktopImage);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImageUrl, setMobileImageUrl] = useState<string | null>(initialCampaign?.mobile_image_url ?? null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(initialCampaign?.mobile_image_url ?? null);
  const [pendingCrop, setPendingCrop] = useState<PendingCampaignCrop | null>(null);
  const [errors, setErrors] = useState<CampaignFormErrors>({});
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const revokeObjectUrl = (url: string | null) => {
    if (!url || !objectUrlsRef.current.includes(url)) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current = objectUrlsRef.current.filter((item) => item !== url);
  };

  const selectImage = (
    kind: BannerCropKind,
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

    const sourceUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(sourceUrl);
    setPendingCrop({ kind, file, sourceUrl });
  };

  const cancelCrop = () => {
    revokeObjectUrl(pendingCrop?.sourceUrl ?? null);
    setPendingCrop(null);
  };

  const confirmCrop = (croppedFile: File) => {
    if (!pendingCrop) return;
    const previewUrl = URL.createObjectURL(croppedFile);
    objectUrlsRef.current.push(previewUrl);

    if (pendingCrop.kind === "desktop") {
      revokeObjectUrl(desktopPreview);
      setDesktopImageFile(croppedFile);
      setDesktopPreview(previewUrl);
      setErrors((current) => ({ ...current, desktopImage: undefined }));
    } else {
      revokeObjectUrl(mobilePreview);
      setMobileImageFile(croppedFile);
      setMobilePreview(previewUrl);
      setErrors((current) => ({ ...current, mobileImage: undefined }));
    }

    revokeObjectUrl(pendingCrop.sourceUrl);
    setPendingCrop(null);
  };

  const removeImage = (kind: BannerCropKind) => {
    if (kind === "desktop") {
      revokeObjectUrl(desktopPreview);
      setDesktopImageFile(null);
      setDesktopImageUrl(null);
      setDesktopPreview(null);
      setErrors((current) => ({ ...current, desktopImage: undefined }));
      return;
    }

    revokeObjectUrl(mobilePreview);
    setMobileImageFile(null);
    setMobileImageUrl(null);
    setMobilePreview(null);
    setErrors((current) => ({ ...current, mobileImage: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: CampaignFormErrors = {};
    const parsedOrder = Number(displayOrder);

    if (!title.trim()) nextErrors.title = "Title is required.";
    if (!buttonText.trim()) nextErrors.buttonText = "CTA text is required.";
    if (!buttonUrl.trim()) {
      nextErrors.buttonUrl = "CTA URL is required.";
    } else if (!isValidDestination(buttonUrl.trim())) {
      nextErrors.buttonUrl = "Use an internal path such as /shop or a full http(s) URL.";
    }
    if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
      nextErrors.displayOrder = "Display order must be a whole number of 0 or greater.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      label: label.trim(),
      title: title.trim(),
      description: description.trim(),
      buttonText: buttonText.trim(),
      buttonUrl: buttonUrl.trim(),
      desktopImageFile,
      desktopImageUrl,
      mobileImageFile,
      mobileImageUrl,
      isActive,
      displayOrder: parsedOrder,
    });
  };

  const renderImageField = (
    kind: BannerCropKind,
    fieldLabel: string,
    hint: string,
    preview: string | null
  ) => {
    const inputId = `campaign-${kind}-image`;
    const progress = uploadProgress[kind === "desktop" ? "desktopImage" : "mobileImage"];
    const error = errors[kind === "desktop" ? "desktopImage" : "mobileImage"];
    const pickerClass = kind === "desktop"
      ? styles.campaignDesktopImagePicker
      : styles.campaignMobileImagePicker;

    return (
      <div className={styles.imageField}>
        <div className={styles.imageLabelRow}>
          <div>
            <label className={styles.label} htmlFor={inputId}>{fieldLabel}</label>
            <span className={styles.hint}>{hint}</span>
          </div>
          {preview && (
            <button type="button" className={styles.removeImageBtn} onClick={() => removeImage(kind)} disabled={submitting}>Remove</button>
          )}
        </div>
        <label className={`${styles.imagePicker} ${pickerClass}`} htmlFor={inputId}>
          {preview ? (
            // Local object URLs and Supabase public URLs are both valid here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${fieldLabel} preview`} />
          ) : (
            <span className={styles.emptyImage}>
              <i className="ri-image-add-line" />
              Choose an image
            </span>
          )}
          {progress !== null && <span className={styles.uploadOverlay}>Uploading {progress}%</span>}
        </label>
        <input id={inputId} className={styles.hiddenInput} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => selectImage(kind, event)} disabled={submitting} />
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
          <p>Editorial copy and destination displayed over the homepage Campaign visual.</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="campaign-label">Small label</label>
              <input id="campaign-label" className={styles.input} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} disabled={submitting} placeholder="SEASONAL CAMPAIGN" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="campaign-title">Title</label>
              <input id="campaign-title" className={styles.input} value={title} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: undefined })); }} maxLength={160} disabled={submitting} aria-invalid={Boolean(errors.title)} />
              {errors.title && <span className={styles.fieldError}>{errors.title}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="campaign-description">Description</label>
            <textarea id="campaign-description" className={styles.textarea} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={500} disabled={submitting} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="campaign-button-text">CTA text</label>
              <input id="campaign-button-text" className={styles.input} value={buttonText} onChange={(event) => { setButtonText(event.target.value); setErrors((current) => ({ ...current, buttonText: undefined })); }} maxLength={60} disabled={submitting} aria-invalid={Boolean(errors.buttonText)} />
              {errors.buttonText && <span className={styles.fieldError}>{errors.buttonText}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="campaign-button-url">CTA URL</label>
              <input id="campaign-button-url" className={styles.input} value={buttonUrl} onChange={(event) => { setButtonUrl(event.target.value); setErrors((current) => ({ ...current, buttonUrl: undefined })); }} placeholder="/shop" disabled={submitting} aria-invalid={Boolean(errors.buttonUrl)} />
              {errors.buttonUrl && <span className={styles.fieldError}>{errors.buttonUrl}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Campaign images</h3>
          <p>Desktop and Mobile artwork are cropped and stored independently. Mobile falls back to Desktop when omitted.</p>
        </div>
        <div className={`${styles.sectionBody} ${styles.imageGrid}`}>
          {renderImageField("desktop", "Desktop Image", "16:9 · JPG, PNG or WEBP · max 5 MB", desktopPreview)}
          {renderImageField("mobile", "Mobile Image (optional)", "4:5 · used at 768px and below", mobilePreview)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Publishing</h3>
          <p>Active Campaign blocks appear publicly in ascending display order.</p>
        </div>
        <div className={`${styles.sectionBody} ${styles.row}`}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="campaign-display-order">Display order</label>
            <input id="campaign-display-order" type="number" min="0" step="1" className={styles.input} value={displayOrder} onChange={(event) => { setDisplayOrder(event.target.value); setErrors((current) => ({ ...current, displayOrder: undefined })); }} disabled={submitting} aria-invalid={Boolean(errors.displayOrder)} />
            {errors.displayOrder && <span className={styles.fieldError}>{errors.displayOrder}</span>}
          </div>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={submitting} />
            <span>
              <strong>Active</strong>
              <small>Show this Campaign on the public homepage.</small>
            </span>
          </label>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting && <span className={styles.spinner} aria-hidden="true" />}
          {submitting ? "Saving..." : initialCampaign ? "Save Changes" : "Add Campaign"}
        </button>
      </div>

      {pendingCrop && (
        <BannerImageCropper
          file={pendingCrop.file}
          kind={pendingCrop.kind}
          preset="campaign"
          sourceUrl={pendingCrop.sourceUrl}
          onCancel={cancelCrop}
          onConfirm={confirmCrop}
        />
      )}
    </form>
  );
}
