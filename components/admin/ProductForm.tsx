"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Category, ProductStatus, ProductWithRelations } from "@/types/database";
import { DEFAULT_PRODUCT_WEIGHT_KG } from "@/lib/product-weight";
import { validateImageFile } from "@/lib/storage";
import {
  PRODUCT_SIZES,
  slugify,
  validateProductForm,
  validateProductSizeInventory,
  type ProductFormErrors,
  type ProductFormValues,
  type ProductSizeFormValue,
} from "@/lib/admin-products";
import ImageUploader from "./ImageUploader";
import styles from "./ProductForm.module.css";

export interface ProductFormProps {
  categories: Category[];
  initialProduct?: ProductWithRelations | null;
  submitting: boolean;
  serverError: string | null;
  newArrivalLimitReached: boolean;
  newArrivalUploadProgress: number | null;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}

type TextFieldValues = Omit<
  ProductFormValues,
  "images" | "newArrivalThumbnail" | "sizeInventory"
>;

function toFormValues(product?: ProductWithRelations | null): TextFieldValues {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    brand: product?.brand ?? "",
    sku: product?.sku ?? "",
    price: product ? String(product.price) : "",
    comparePrice: product?.compare_price != null ? String(product.compare_price) : "",
    categoryId: product?.category_id ?? "",
    stock: product ? String(product.stock) : "0",
    weight: String(product?.weight ?? DEFAULT_PRODUCT_WEIGHT_KG),
    status: product?.status ?? "active",
    shortDescription: product?.short_description ?? "",
    description: product?.description ?? "",
    featured: product?.featured ?? false,
    shopeeUrl: product?.shopee_url ?? "",
    tokopediaUrl: product?.tokopedia_url ?? "",
    tiktokShopUrl: product?.tiktok_shop_url ?? product?.tiktok_url ?? "",
    lazadaUrl: product?.lazada_url ?? "",
    blibliUrl: product?.blibli_url ?? "",
  };
}

export default function ProductForm({
  categories,
  initialProduct,
  submitting,
  serverError,
  newArrivalLimitReached,
  newArrivalUploadProgress,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [values, setValues] = useState<TextFieldValues>(() => toFormValues(initialProduct));
  const [sizeInventory, setSizeInventory] = useState<ProductSizeFormValue[]>(() =>
    PRODUCT_SIZES.map((size) => {
      const existing = initialProduct?.product_size_inventory?.find(
        (candidate) => candidate.size === size
      );
      return {
        size,
        isEnabled: existing?.is_enabled ?? false,
        stock: String(existing?.stock ?? 0),
      };
    })
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct));
  const [newArrivalImageUrl, setNewArrivalImageUrl] = useState<string | null>(
    initialProduct?.new_arrival_image_url ?? null
  );
  const [newArrivalImageFile, setNewArrivalImageFile] = useState<File | null>(null);
  const [newArrivalPreview, setNewArrivalPreview] = useState<string | null>(
    initialProduct?.new_arrival_image_url ?? null
  );
  const [newArrivalImageError, setNewArrivalImageError] = useState<string | null>(null);
  const newArrivalObjectUrlRef = useRef<string | null>(null);
  const clientProductId = useMemo(() => initialProduct?.id ?? crypto.randomUUID(), [initialProduct]);
  const initialImages = useMemo(() => initialProduct?.product_images ?? [], [initialProduct]);
  const [imagesValue, setImagesValue] = useState<ProductFormValues["images"]>(() => ({
    productId: clientProductId,
    images: initialImages.map((image, index) => ({
      id: image.id,
      imageUrl: image.image_url,
      isThumbnail:
        image.is_thumbnail ||
        (!initialImages.some((candidate) => candidate.is_thumbnail) && index === 0),
      storagePath: null,
    })),
    removedImages: [],
    uploading: false,
  }));

  const handleImagesChange = useCallback((next: ProductFormValues["images"]) => {
    setImagesValue(next);
  }, []);

  useEffect(() => {
    return () => {
      if (newArrivalObjectUrlRef.current) {
        URL.revokeObjectURL(newArrivalObjectUrlRef.current);
      }
    };
  }, []);

  const selectNewArrivalImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setNewArrivalImageError(validationError);
      return;
    }

    if (newArrivalObjectUrlRef.current) {
      URL.revokeObjectURL(newArrivalObjectUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    newArrivalObjectUrlRef.current = previewUrl;
    setNewArrivalImageFile(file);
    setNewArrivalPreview(previewUrl);
    setNewArrivalImageError(null);
  };

  const removeNewArrivalImage = () => {
    if (newArrivalObjectUrlRef.current) {
      URL.revokeObjectURL(newArrivalObjectUrlRef.current);
      newArrivalObjectUrlRef.current = null;
    }
    setNewArrivalImageFile(null);
    setNewArrivalImageUrl(null);
    setNewArrivalPreview(null);
    setNewArrivalImageError(
      values.featured
        ? "A custom thumbnail is required while this product is selected for New Arrivals."
        : null
    );
  };

  const setField = <K extends keyof TextFieldValues>(field: K, value: TextFieldValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setSizeField = (
    size: ProductSizeFormValue["size"],
    field: "isEnabled" | "stock",
    value: boolean | string
  ) => {
    setSizeInventory((current) =>
      current.map((item) =>
        item.size === size ? { ...item, [field]: value } : item
      )
    );
    if (errors.sizeInventory) {
      setErrors((current) => ({ ...current, sizeInventory: undefined }));
    }
  };

  const handleNameChange = (name: string) => {
    setValues((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateProductForm(values);
    const sizeInventoryError = validateProductSizeInventory(sizeInventory);
    if (sizeInventoryError) nextErrors.sizeInventory = sizeInventoryError;
    setErrors(nextErrors);
    const missingNewArrivalImage =
      values.featured && !newArrivalImageUrl && !newArrivalImageFile;
    setNewArrivalImageError(
      missingNewArrivalImage
        ? "Upload a custom thumbnail for this selected New Arrival product."
        : null
    );
    if (
      Object.keys(nextErrors).length === 0 &&
      !imagesValue.uploading &&
      !missingNewArrivalImage
    ) {
      onSubmit({
        ...values,
        sizeInventory,
        newArrivalThumbnail: {
          imageUrl: newArrivalImageUrl,
          file: newArrivalImageFile,
        },
        images: imagesValue,
      });
    }
  };

  const hasEnabledSizes = sizeInventory.some((item) => item.isEnabled);
  const enabledSizeStock = sizeInventory
    .filter((item) => item.isEnabled)
    .reduce((total, item) => total + (Number(item.stock) || 0), 0);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className={styles.errorBox} role="alert">
          <i className="ri-error-warning-line" />
          <span>{serverError}</span>
        </div>
      )}

      <section className={styles.section} aria-labelledby="general-heading">
        <div className={styles.sectionHeader}>
          <h3 id="general-heading">General Information</h3>
          <p>Core catalog details customers and staff use to identify the product.</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-name">Product Name</label>
            <input
              id="product-name"
              className={styles.input}
              value={values.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="e.g. Oversized Knit Sweater"
              aria-invalid={Boolean(errors.name)}
              disabled={submitting}
            />
            {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-slug">Slug</label>
            <input
              id="product-slug"
              className={styles.input}
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setField("slug", event.target.value);
              }}
              placeholder="oversized-knit-sweater"
              aria-invalid={Boolean(errors.slug)}
              disabled={submitting}
            />
            <span className={styles.hint}>Auto-generated from the name, but you can edit it.</span>
            {errors.slug && <span className={styles.fieldError}>{errors.slug}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-category">Category</label>
              <select
                id="product-category"
                className={styles.input}
                value={values.categoryId}
                onChange={(event) => setField("categoryId", event.target.value)}
                aria-invalid={Boolean(errors.categoryId)}
                disabled={submitting}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className={styles.fieldError}>{errors.categoryId}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-brand">Brand</label>
              <input
                id="product-brand"
                className={styles.input}
                value={values.brand}
                onChange={(event) => setField("brand", event.target.value)}
                placeholder="e.g. Catchus"
                disabled={submitting}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pricing-heading">
        <div className={styles.sectionHeader}>
          <h3 id="pricing-heading">Pricing</h3>
          <p>Set the selling price and optional original price shown for discounts.</p>
        </div>
        <div className={`${styles.sectionBody} ${styles.row}`}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-price">Price (Rp)</label>
            <input id="product-price" type="number" min="0" step="1" className={styles.input} value={values.price} onChange={(event) => setField("price", event.target.value)} placeholder="150000" aria-invalid={Boolean(errors.price)} disabled={submitting} />
            {errors.price && <span className={styles.fieldError}>{errors.price}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-compare-price">Compare Price (Rp)</label>
            <input id="product-compare-price" type="number" min="0" step="1" className={styles.input} value={values.comparePrice} onChange={(event) => setField("comparePrice", event.target.value)} placeholder="200000" aria-invalid={Boolean(errors.comparePrice)} disabled={submitting} />
            {errors.comparePrice && <span className={styles.fieldError}>{errors.comparePrice}</span>}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="inventory-heading">
        <div className={styles.sectionHeader}>
          <h3 id="inventory-heading">Inventory</h3>
          <p>Track sellable quantity, fulfillment details, and publishing state.</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.threeColumnRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-sku">SKU</label>
              <input id="product-sku" className={styles.input} value={values.sku} onChange={(event) => setField("sku", event.target.value)} placeholder="CTS-SWT-001" disabled={submitting} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-stock">Stock</label>
              <input id="product-stock" type="number" min="0" step="1" className={styles.input} value={hasEnabledSizes ? String(enabledSizeStock) : values.stock} onChange={(event) => setField("stock", event.target.value)} aria-invalid={Boolean(errors.stock)} disabled={submitting || hasEnabledSizes} />
              <span className={styles.hint}>
                {hasEnabledSizes
                  ? "Calculated from enabled sizes."
                  : "Legacy stock used when no size is enabled."}
              </span>
              {errors.stock && <span className={styles.fieldError}>{errors.stock}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-weight">Weight (kg)</label>
              <input id="product-weight" type="number" min="0" step="0.01" className={styles.input} value={values.weight} onChange={(event) => setField("weight", event.target.value)} placeholder="0.30" aria-invalid={Boolean(errors.weight)} disabled={submitting} required />
              {errors.weight && <span className={styles.fieldError}>{errors.weight}</span>}
            </div>
          </div>
          <div className={styles.sizeInventory}>
            <div className={styles.sizeInventoryHeader}>
              <span className={styles.label}>Sizes &amp; Stock</span>
              <span className={styles.hint}>Enable only the sizes customers can select.</span>
            </div>
            <div className={styles.sizeGrid}>
              {sizeInventory.map((item) => (
                <div className={styles.sizeRow} key={item.size}>
                  <label className={styles.sizeToggle}>
                    <input
                      type="checkbox"
                      checked={item.isEnabled}
                      onChange={(event) =>
                        setSizeField(item.size, "isEnabled", event.target.checked)
                      }
                      disabled={submitting}
                    />
                    <strong>{item.size}</strong>
                  </label>
                  <label className={styles.sizeStock}>
                    <span>Stock</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.stock}
                      onChange={(event) =>
                        setSizeField(item.size, "stock", event.target.value)
                      }
                      disabled={submitting || !item.isEnabled}
                      aria-label={`Stock for size ${item.size}`}
                    />
                  </label>
                </div>
              ))}
            </div>
            {errors.sizeInventory && (
              <span className={styles.fieldError}>{errors.sizeInventory}</span>
            )}
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-status">Status</label>
              <select id="product-status" className={styles.input} value={values.status} onChange={(event) => setField("status", event.target.value as ProductStatus)} disabled={submitting}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <div className={styles.toggleWrap}>
              <span className={styles.label}>New Arrival</span>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={values.featured}
                  onChange={(event) => setField("featured", event.target.checked)}
                  disabled={submitting || (newArrivalLimitReached && !values.featured)}
                />
                <span>Show this product in the homepage New Arrivals section</span>
              </label>
              {newArrivalLimitReached && !values.featured && (
                <span className={styles.fieldError}>
                  The 2 New Arrival slots are full. Remove one before selecting this product.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="description-heading">
        <div className={styles.sectionHeader}>
          <h3 id="description-heading">Description</h3>
          <p>Prepare concise and detailed content for future product experiences.</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-short-description">Short Description</label>
            <textarea id="product-short-description" className={styles.textarea} value={values.shortDescription} onChange={(event) => setField("shortDescription", event.target.value)} placeholder="A concise summary for quick views and previews..." rows={3} maxLength={300} disabled={submitting} />
            <span className={styles.hint}>{values.shortDescription.length}/300 characters</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-description">Full Description</label>
            <textarea id="product-description" className={`${styles.textarea} ${styles.fullDescription}`} value={values.description} onChange={(event) => setField("description", event.target.value)} placeholder="Materials, fit, care instructions, and complete product details..." rows={7} disabled={submitting} />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="images-heading">
        <div className={styles.sectionHeader}>
          <h3 id="images-heading">Images</h3>
          <p>Upload a main thumbnail and supporting gallery photos.</p>
        </div>
        <div className={styles.sectionBody}>
          <ImageUploader productId={clientProductId} initialImages={initialImages} disabled={submitting} onChange={handleImagesChange} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="new-arrival-image-heading">
        <div className={styles.sectionHeader}>
          <h3 id="new-arrival-image-heading">New Arrival Thumbnail</h3>
          <p>
            Used only by the homepage New Arrivals card. The product thumbnail and gallery
            are not changed.
          </p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.newArrivalImageField}>
            <div className={styles.newArrivalImageHeader}>
              <div>
                <span className={styles.label}>Custom homepage image</span>
                <span className={styles.hint}>JPG, PNG or WEBP · max 5 MB</span>
              </div>
              {newArrivalPreview && (
                <button
                  type="button"
                  className={styles.removeThumbnailBtn}
                  onClick={removeNewArrivalImage}
                  disabled={submitting}
                >
                  Remove
                </button>
              )}
            </div>

            <label className={styles.newArrivalImagePicker} htmlFor="new-arrival-image">
              {newArrivalPreview ? (
                // Preview may be a local object URL or a Supabase public URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={newArrivalPreview} alt="New Arrival thumbnail preview" />
              ) : (
                <span className={styles.newArrivalImageEmpty}>
                  <i className="ri-image-add-line" aria-hidden="true" />
                  Choose a custom thumbnail
                </span>
              )}
              {newArrivalUploadProgress !== null && (
                <span className={styles.thumbnailUploadOverlay}>
                  Uploading {newArrivalUploadProgress}%
                </span>
              )}
            </label>
            <input
              id="new-arrival-image"
              className={styles.hiddenInput}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={selectNewArrivalImage}
              disabled={submitting}
            />
            {newArrivalImageError && (
              <span className={styles.fieldError}>{newArrivalImageError}</span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="marketplace-heading">
        <div className={styles.sectionHeader}>
          <h3 id="marketplace-heading">Marketplace</h3>
          <p>Connect customers to this product on each supported sales channel.</p>
        </div>
        <div className={`${styles.sectionBody} ${styles.marketplaceGrid}`}>
          {([
            ["shopeeUrl", "Shopee URL", "https://shopee.co.id/..."] as const,
            ["tokopediaUrl", "Tokopedia URL", "https://tokopedia.com/..."] as const,
            ["tiktokShopUrl", "TikTok Shop URL", "https://shop.tiktok.com/..."] as const,
            ["lazadaUrl", "Lazada URL", "https://www.lazada.co.id/..."] as const,
            ["blibliUrl", "Blibli URL", "https://www.blibli.com/..."] as const,
          ]).map(([field, label, placeholder]) => (
            <div className={styles.field} key={field}>
              <label className={styles.label} htmlFor={`product-${field}`}>{label}</label>
              <input id={`product-${field}`} type="url" className={styles.input} value={values[field]} onChange={(event) => setField(field, event.target.value)} placeholder={placeholder} aria-invalid={Boolean(errors[field])} disabled={submitting} />
              {errors[field] && <span className={styles.fieldError}>{errors[field]}</span>}
            </div>
          ))}
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className={styles.submitBtn} disabled={submitting || imagesValue.uploading}>
          {submitting && <span className={styles.spinner} aria-hidden="true" />}
          {submitting ? "Saving..." : imagesValue.uploading ? "Uploading images..." : initialProduct ? "Save Changes" : "Add Product"}
        </button>
      </div>
    </form>
  );
}
