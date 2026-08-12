"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  getWebsiteSettings,
  updateWebsiteSettings,
  DEFAULT_WEBSITE_SETTINGS,
  type WebsiteSettingsResult,
} from "@/lib/website-settings";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  BANNER_IMAGE_BUCKET,
  MAX_IMAGE_SIZE_BYTES,
  deleteStorageImage,
  getImagePathFromPublicUrl,
  uploadWebsiteFavicon,
  validateImageFile,
} from "@/lib/storage";
import type { WebsiteSettings, WebsiteSettingsUpdate } from "@/types/database";
import styles from "./settings.module.css";

type SettingsFormValues = Omit<WebsiteSettings, "id" | "updated_at">;
type FieldErrors = Partial<Record<keyof SettingsFormValues, string>>;

const REQUIRED_FIELDS: Array<keyof SettingsFormValues> = [
  "brand_name",
  "website_title",
  "website_description",
  "hero_title",
  "hero_subtitle",
  "hero_button_text",
  "hero_button_url",
  "copyright_text",
];

function toFormValues(settings: WebsiteSettings): SettingsFormValues {
  const { id: _id, updated_at: _updatedAt, ...values } = settings;
  return {
    ...values,
    favicon_url: values.favicon_url || DEFAULT_WEBSITE_SETTINGS.favicon_url,
  };
}

function friendlyError(result: WebsiteSettingsResult): string {
  const detail = result.error?.trim();
  if (!detail) return "Website settings could not be loaded or saved. Please try again.";
  if (
    detail.toLowerCase().includes("row-level security") ||
    detail.toLowerCase().includes("permission denied")
  ) {
    return `You don't have permission to update website settings. Please sign in again. Supabase: ${detail}`;
  }
  return `Website settings request failed. Supabase: ${detail}`;
}

function validate(values: SettingsFormValues): FieldErrors {
  const errors: FieldErrors = {};
  REQUIRED_FIELDS.forEach((field) => {
    if (!values[field]?.trim()) errors[field] = "This field is required.";
  });

  const externalUrls: Array<keyof SettingsFormValues> = [
    "logo_url",
    "favicon_url",
    "instagram_url",
    "tiktok_url",
    "facebook_url",
    "shopee_url",
    "tokopedia_url",
    "tiktok_shop_url",
  ];

  externalUrls.forEach((field) => {
    const value = values[field]?.trim();
    if (!value || value.startsWith("/")) return;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) errors[field] = "Use an http or https URL.";
    } catch {
      errors[field] = "Enter a complete URL, including https://.";
    }
  });

  const heroUrl = values.hero_button_url.trim();
  if (heroUrl && !heroUrl.startsWith("/") && !heroUrl.startsWith("#")) {
    try {
      const url = new URL(heroUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.hero_button_url = "Use an http(s) URL, /path, or #section.";
      }
    } catch {
      errors.hero_button_url = "Use a full URL, /path, or #section.";
    }
  } else if (heroUrl.startsWith("//")) {
    errors.hero_button_url = "Use a full URL, /path, or #section.";
  }

  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function SettingsContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [values, setValues] = useState<SettingsFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
  const [savedFaviconUrl, setSavedFaviconUrl] = useState<string | null>(null);
  const [faviconPreviewFailed, setFaviconPreviewFailed] = useState(false);
  const [faviconUploadProgress, setFaviconUploadProgress] = useState(0);
  const [faviconError, setFaviconError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getWebsiteSettings(supabaseBrowser).then((result) => {
      if (!mounted) return;
      if (result.data) {
        setValues(toFormValues(result.data));
        setSavedFaviconUrl(result.data.favicon_url);
        setFaviconPreviewUrl(
          result.data.favicon_url || DEFAULT_WEBSITE_SETTINGS.favicon_url
        );
      }
      else setErrorMessage(friendlyError(result));
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (faviconPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(faviconPreviewUrl);
      }
    };
  }, [faviconPreviewUrl]);

  const setField = (field: keyof SettingsFormValues, value: string) => {
    setValues((current) => (current ? { ...current, [field]: value } : current));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage(null);
  };

  const handleFaviconUrlChange = (value: string) => {
    setFaviconFile(null);
    setFaviconUploadProgress(0);
    setFaviconError(null);
    setFaviconPreviewFailed(false);
    setFaviconPreviewUrl(value.trim() || DEFAULT_WEBSITE_SETTINGS.favicon_url);
    setField("favicon_url", value);
  };

  const handleFaviconSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setFaviconError(validationError);
      return;
    }

    setFaviconFile(file);
    setFaviconPreviewUrl(URL.createObjectURL(file));
    setFaviconPreviewFailed(false);
    setFaviconUploadProgress(0);
    setFaviconError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const optional = (value: string | null) => value?.trim() || null;
    let uploadedFaviconPath: string | null = null;
    let operation: "upload" | "save" = faviconFile ? "upload" : "save";

    try {
      let faviconUrl = optional(values.favicon_url);
      if (faviconFile) {
        const uploaded = await uploadWebsiteFavicon(
          faviconFile,
          setFaviconUploadProgress
        ).promise;
        uploadedFaviconPath = uploaded.path;
        faviconUrl = uploaded.publicUrl;
        operation = "save";
      }

      const payload: WebsiteSettingsUpdate = {
        brand_name: values.brand_name.trim(),
        website_title: values.website_title.trim(),
        website_description: values.website_description.trim(),
        logo_url: optional(values.logo_url),
        favicon_url: faviconUrl,
        hero_title: values.hero_title.trim(),
        hero_subtitle: values.hero_subtitle.trim(),
        hero_button_text: values.hero_button_text.trim(),
        hero_button_url: values.hero_button_url.trim(),
        whatsapp: optional(values.whatsapp),
        email: optional(values.email),
        instagram_url: optional(values.instagram_url),
        tiktok_url: optional(values.tiktok_url),
        facebook_url: optional(values.facebook_url),
        shopee_url: optional(values.shopee_url),
        tokopedia_url: optional(values.tokopedia_url),
        tiktok_shop_url: optional(values.tiktok_shop_url),
        copyright_text: values.copyright_text.trim(),
      };
      const result = await updateWebsiteSettings(supabaseBrowser, payload);

      if (!result.data) {
        if (uploadedFaviconPath) {
          await deleteStorageImage(uploadedFaviconPath, BANNER_IMAGE_BUCKET);
        }
        const message = friendlyError(result);
        setErrorMessage(message);
        if (faviconFile) {
          setFaviconError(`The favicon was uploaded, but its URL could not be saved. ${message}`);
        }
        return;
      }

      const nextFaviconUrl = result.data.favicon_url;
      if (savedFaviconUrl && savedFaviconUrl !== nextFaviconUrl) {
        const previousPath = getImagePathFromPublicUrl(
          savedFaviconUrl,
          BANNER_IMAGE_BUCKET
        );
        if (previousPath) {
          await deleteStorageImage(previousPath, BANNER_IMAGE_BUCKET);
        }
      }

      setValues(toFormValues(result.data));
      setSavedFaviconUrl(nextFaviconUrl);
      setFaviconPreviewUrl(
        nextFaviconUrl || DEFAULT_WEBSITE_SETTINGS.favicon_url
      );
      setFaviconFile(null);
      setFaviconUploadProgress(0);
      setFaviconError(null);
      setSuccessMessage("Website settings saved successfully.");
    } catch (error: unknown) {
      if (uploadedFaviconPath) {
        await deleteStorageImage(uploadedFaviconPath, BANNER_IMAGE_BUCKET);
      }
      const detail = error instanceof Error ? error.message : "Please try again.";
      const message = operation === "upload"
        ? `Favicon upload failed. ${detail}`
        : `Website settings could not be saved. ${detail}`;
      if (faviconFile) setFaviconError(message);
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const field = (
    name: keyof SettingsFormValues,
    label: string,
    placeholder: string,
    type: "text" | "url" | "email" = "text"
  ) => (
    <div className={styles.field}>
      <label htmlFor={`setting-${name}`}>{label}</label>
      <input
        id={`setting-${name}`}
        type={type}
        value={values?.[name] ?? ""}
        onChange={(event) => setField(name, event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(errors[name])}
        disabled={saving}
      />
      {errors[name] && <span className={styles.fieldError}>{errors[name]}</span>}
    </div>
  );

  return (
    <div className={styles.shell}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={styles.main}>
        <Topbar title="Settings" onOpenMobile={() => setMobileOpen(true)} />
        <div className={styles.content}>
          {errorMessage && <div className={`${styles.banner} ${styles.error}`} role="alert"><i className="ri-error-warning-line" /><span>{errorMessage}</span></div>}
          {successMessage && <div className={`${styles.banner} ${styles.success}`} role="status"><i className="ri-checkbox-circle-line" /><span>{successMessage}</span></div>}

          {loading ? (
            <div className={styles.loading}><span className={styles.spinner} />Loading website settings...</div>
          ) : values ? (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <section className={styles.card}>
                <div className={styles.cardHeader}><div><i className="ri-global-line" /><h2>General</h2></div><p>Brand identity and website metadata.</p></div>
                <div className={styles.cardBody}>
                  <div className={styles.grid}>{field("brand_name", "Brand Name", "Catchus")}{field("website_title", "Website Title", "Catchus Official")}</div>
                  <div className={styles.field}><label htmlFor="setting-website_description">Website Description</label><textarea id="setting-website_description" rows={3} value={values.website_description} onChange={(event) => setField("website_description", event.target.value)} aria-invalid={Boolean(errors.website_description)} disabled={saving} />{errors.website_description && <span className={styles.fieldError}>{errors.website_description}</span>}</div>
                  <div className={styles.grid}>
                    {field("logo_url", "Logo URL", "https://... or /images/logo.png", "url")}
                    <div className={styles.field}>
                      <label htmlFor="setting-favicon_url">Favicon URL</label>
                      <input
                        id="setting-favicon_url"
                        type="url"
                        value={values.favicon_url ?? ""}
                        onChange={(event) => handleFaviconUrlChange(event.target.value)}
                        placeholder="/icons/logo.png"
                        aria-invalid={Boolean(errors.favicon_url || faviconError)}
                        disabled={saving}
                      />
                      {errors.favicon_url && (
                        <span className={styles.fieldError}>{errors.favicon_url}</span>
                      )}

                      <div className={styles.faviconUpload}>
                        <div className={styles.faviconPreview}>
                          {faviconPreviewUrl && !faviconPreviewFailed ? (
                            // A native image supports both local paths and admin-supplied remote URLs.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={faviconPreviewUrl}
                              alt="Current favicon preview"
                              onError={() => setFaviconPreviewFailed(true)}
                            />
                          ) : (
                            <i className="ri-image-line" aria-hidden="true" />
                          )}
                        </div>
                        <div className={styles.faviconControls}>
                          <label
                            htmlFor="setting-favicon-upload"
                            className={styles.uploadButton}
                            aria-disabled={saving}
                          >
                            {faviconPreviewUrl ? "Replace Favicon" : "Upload Favicon"}
                          </label>
                          <input
                            id="setting-favicon-upload"
                            className={styles.hiddenFileInput}
                            type="file"
                            accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
                            onChange={handleFaviconSelect}
                            disabled={saving}
                          />
                          <span className={styles.uploadHint}>
                            PNG, JPG, or WEBP. Maximum {Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)} MB.
                          </span>
                          {faviconFile && (
                            <span className={styles.selectedFile}>{faviconFile.name}</span>
                          )}
                          {saving && faviconFile && (
                            <div
                              className={styles.uploadProgress}
                              role="progressbar"
                              aria-label="Favicon upload progress"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={faviconUploadProgress}
                            >
                              <span style={{ width: `${faviconUploadProgress}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                      {faviconPreviewFailed && (
                        <span className={styles.fieldError}>The favicon preview could not be loaded.</span>
                      )}
                      {faviconError && (
                        <span className={styles.fieldError}>{faviconError}</span>
                      )}
                    </div>
                  </div>
                  <p className={styles.hint}>Use a public URL or upload a favicon. The Logo URL remains unchanged.</p>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}><div><i className="ri-layout-top-line" /><h2>Hero</h2></div><p>Homepage hero content only; the existing layout remains unchanged.</p></div>
                <div className={styles.cardBody}>
                  {field("hero_title", "Hero Title", "Catchus Katalog")}
                  <div className={styles.field}><label htmlFor="setting-hero_subtitle">Hero Subtitle</label><textarea id="setting-hero_subtitle" rows={5} value={values.hero_subtitle} onChange={(event) => setField("hero_subtitle", event.target.value)} aria-invalid={Boolean(errors.hero_subtitle)} disabled={saving} />{errors.hero_subtitle && <span className={styles.fieldError}>{errors.hero_subtitle}</span>}</div>
                  <div className={styles.grid}>{field("hero_button_text", "Hero Button Text", "Detail Produk")}{field("hero_button_url", "Hero Button URL", "#produk")}</div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}><div><i className="ri-contacts-line" /><h2>Contact</h2></div><p>Direct customer contact details.</p></div>
                <div className={`${styles.cardBody} ${styles.grid}`}>{field("whatsapp", "WhatsApp", "https://wa.me/628...")}{field("email", "Email", "hello@example.com", "email")}</div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}><div><i className="ri-share-line" /><h2>Social Media</h2></div><p>Public social profile links.</p></div>
                <div className={styles.cardBody}><div className={styles.grid}>{field("instagram_url", "Instagram", "https://instagram.com/...", "url")}{field("tiktok_url", "TikTok", "https://tiktok.com/@...", "url")}</div>{field("facebook_url", "Facebook (Optional)", "https://facebook.com/...", "url")}</div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}><div><i className="ri-store-2-line" /><h2>Marketplace</h2></div><p>Official storefront destinations.</p></div>
                <div className={styles.cardBody}><div className={styles.grid}>{field("shopee_url", "Shopee URL", "https://shopee.co.id/...", "url")}{field("tokopedia_url", "Tokopedia URL", "https://tokopedia.com/...", "url")}</div>{field("tiktok_shop_url", "TikTok Shop URL", "https://shop.tiktok.com/...", "url")}</div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}><div><i className="ri-copyright-line" /><h2>Footer</h2></div><p>Copyright information shown across the storefront.</p></div>
                <div className={styles.cardBody}>{field("copyright_text", "Copyright Text", "© Copyrights 2024 by Catchus Official")}</div>
              </section>

              <div className={styles.actions}>
                <button type="submit" disabled={saving}>
                  {saving && <span className={styles.buttonSpinner} />}
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return <RequireAdminAuth><SettingsContent /></RequireAdminAuth>;
}
